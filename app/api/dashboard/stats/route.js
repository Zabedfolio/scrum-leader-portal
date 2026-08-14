import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Team from '@/models/Team';
import Member from '@/models/Member';
import ScrumSession from '@/models/ScrumSession';
import AttendanceRecord from '@/models/AttendanceRecord';
import Admin from '@/models/Admin';
import { requireAuth } from '@/lib/auth';
import { getStartOfDayBDinUTC, getWeekBoundariesBD } from '@/lib/time';

export async function GET(request) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const isTeamOnlyParam = searchParams.get('isTeamOnly');
    const isTeamOnly = isTeamOnlyParam === 'true';

    // 1. Determine target teams
    let myTeam = null;
    let targetTeams = [];
    if (isTeamOnly) {
      const admin = await Admin.findById(user.id);
      if (admin && admin.myTeamId) {
        myTeam = await Team.findById(admin.myTeamId);
        if (myTeam) {
          targetTeams = [myTeam];
        }
      }
    } else {
      targetTeams = await Team.find({}).sort({ teamCode: 1 });
    }

    // Return empty payload if in Team-Only mode but team is not yet designated
    if (isTeamOnly && targetTeams.length === 0) {
      return NextResponse.json({
        totalTeams: 0,
        totalMembers: 0,
        sessionStatuses: [],
        flaggedMembers: [],
        attendanceTrends: [],
        teamPointsData: [],
        teamNotConfigured: true,
      });
    }

    const todayDate = new Date();
    const normalizedToday = getStartOfDayBDinUTC(todayDate);

    // Get current week boundaries in UTC (derived from BST)
    const { startOfWeek, endOfWeek } = getWeekBoundariesBD(todayDate);

    // Fetch quick counts
    const totalTeams = isTeamOnly ? 1 : await Team.countDocuments();
    const totalMembers = isTeamOnly
      ? await Member.countDocuments({ teamId: myTeam._id, isActive: true })
      : await Member.countDocuments({ isActive: true });

    const getStatus = (session) => {
      if (!session) return 'not_started';
      if (session.locked) return 'finalized';
      if (
        session.checkInToken &&
        session.checkInTokenExpiresAt &&
        new Date() < new Date(session.checkInTokenExpiresAt)
      ) {
        return 'active';
      }
      return 'unfinalized';
    };

    // 2. Compute session status for target teams
    const sessionStatuses = await Promise.all(
      targetTeams.map(async (team) => {
        if (isTeamOnly) {
          const todaySessions = await ScrumSession.find({
            date: normalizedToday,
            teamId: team._id,
            isTeamOnly: true,
          });

          const customSessions = todaySessions.map(sess => ({
            status: getStatus(sess),
            sessionId: sess._id,
            token: sess.checkInToken,
            sessionType: sess.sessionType,
          }));

          return {
            teamId: team._id,
            teamCode: team.teamCode,
            teamName: team.teamName,
            customSessions,
            isTeamOnly: true,
          };
        } else {
          const daySession = await ScrumSession.findOne({
            date: normalizedToday,
            sessionType: 'Day',
            teamId: team._id,
            isTeamOnly: false,
          });

          const afternoonSession = await ScrumSession.findOne({
            date: normalizedToday,
            sessionType: 'Afternoon',
            teamId: team._id,
            isTeamOnly: false,
          });

          return {
            teamId: team._id,
            teamCode: team.teamCode,
            teamName: team.teamName,
            Day: {
              status: getStatus(daySession),
              sessionId: daySession ? daySession._id : null,
              token: daySession ? daySession.checkInToken : null,
            },
            Afternoon: {
              status: getStatus(afternoonSession),
              sessionId: afternoonSession ? afternoonSession._id : null,
              token: afternoonSession ? afternoonSession.checkInToken : null,
            },
            isTeamOnly: false,
          };
        }
      })
    );

    // 3. Compute at-risk members list (restricted by platform mode)
    const activeMembersQuery = { isActive: true };
    if (isTeamOnly) {
      activeMembersQuery.teamId = myTeam._id;
    }
    const activeMembers = await Member.find(activeMembersQuery).populate('teamId');
    const flaggedMembers = [];

    // Filter sessions to only count metrics from matching platform mode
    const platformSessionIds = await ScrumSession.find({
      isTeamOnly: !!isTeamOnly,
      ...(isTeamOnly && { teamId: myTeam._id }),
    }).select('_id');
    const platformSessionIdsArr = platformSessionIds.map(s => s._id);

    for (const member of activeMembers) {
      const allRecords = await AttendanceRecord.find({
        memberId: member._id,
        sessionId: { $in: platformSessionIdsArr },
      });

      let allTimeNotInformed = 0;
      allRecords.forEach((rec) => {
        if (rec.status === 'absent_not_informed') {
          allTimeNotInformed++;
        }
      });

      let weeklyAbsences = 0;
      for (const rec of allRecords) {
        const session = await ScrumSession.findById(rec.sessionId);
        if (session && session.date >= startOfWeek && session.date <= endOfWeek) {
          if (rec.status === 'absent_not_informed' || rec.status === 'absent_informed') {
            weeklyAbsences++;
          }
        }
      }

      const weeklyRedFlag = weeklyAbsences >= 2;
      const isOrangeWarning = allTimeNotInformed === 3;
      const isRedAtRisk = allTimeNotInformed >= 4;

      if (weeklyRedFlag || isOrangeWarning || isRedAtRisk) {
        flaggedMembers.push({
          _id: member._id,
          name: member.name,
          teamCode: member.teamId ? member.teamId.teamCode : 'N/A',
          teamName: member.teamId ? member.teamId.teamName : 'N/A',
          weeklyAbsences,
          weeklyRedFlag,
          allTimeNotInformed,
          isOrangeWarning,
          isRedAtRisk,
        });
      }
    }

    // 4. Compute Attendance Rate Trends (last 7 sessions in matching platform mode)
    const uniqueSessionDates = await ScrumSession.aggregate([
      {
        $match: {
          isTeamOnly: !!isTeamOnly,
          ...(isTeamOnly && { teamId: myTeam._id }),
        },
      },
      {
        $group: {
          _id: {
            date: '$date',
            sessionType: '$sessionType',
          },
          sessionIds: { $push: '$_id' },
        },
      },
      { $sort: { '_id.date': -1, '_id.sessionType': -1 } },
      { $limit: 7 },
    ]);

    uniqueSessionDates.reverse();

    const attendanceTrends = await Promise.all(
      uniqueSessionDates.map(async (group) => {
        const d = new Date(group._id.date);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        const label = isTeamOnly ? `${dateStr} ${group._id.sessionType}` : `${dateStr} ${group._id.sessionType === 'Day' ? 'Day' : 'Aft'}`;

        const totalRecords = await AttendanceRecord.countDocuments({
          sessionId: { $in: group.sessionIds },
        });

        if (totalRecords === 0) {
          return { label, rate: 100 };
        }

        const presentRecords = await AttendanceRecord.countDocuments({
          sessionId: { $in: group.sessionIds },
          status: 'present',
        });

        const rate = Math.round((presentRecords / totalRecords) * 100);
        return { label, rate };
      })
    );

    // 5. Compute Points Comparison
    const teamPointsData = [];
    if (isTeamOnly) {
      // In Team-Only mode, compare members of my team
      const members = await Member.find({ teamId: myTeam._id, isActive: true });
      for (const m of members) {
        const records = await AttendanceRecord.find({
          memberId: m._id,
          sessionId: { $in: platformSessionIdsArr },
        });

        let presentCount = 0;
        let notInformedCount = 0;
        let informedCount = 0;

        records.forEach((rec) => {
          if (rec.status === 'present') presentCount++;
          else if (rec.status === 'absent_not_informed') notInformedCount++;
          else if (rec.status === 'absent_informed') informedCount++;
        });

        const totalPoints = presentCount * 1 + notInformedCount * -1 + informedCount * 0;
        
        teamPointsData.push({
          teamId: m._id,
          teamCode: m.name.split(' ')[0], // first name for chart X-axis label
          teamName: m.name,
          totalPoints,
          averagePoints: totalPoints,
          memberCount: 1,
        });
      }
      // Sort members by points descending
      teamPointsData.sort((a, b) => b.totalPoints - a.totalPoints);
    } else {
      // In Scrum mode, compare teams averages
      const allTeams = await Team.find({}).sort({ teamCode: 1 });
      for (const team of allTeams) {
        const members = await Member.find({ teamId: team._id, isActive: true });
        let totalPoints = 0;
        for (const m of members) {
          const records = await AttendanceRecord.find({
            memberId: m._id,
            sessionId: { $in: platformSessionIdsArr },
          });
          let presentCount = 0;
          let notInformedCount = 0;
          let informedCount = 0;

          records.forEach((rec) => {
            if (rec.status === 'present') presentCount++;
            else if (rec.status === 'absent_not_informed') notInformedCount++;
            else if (rec.status === 'absent_informed') informedCount++;
          });
          totalPoints += (presentCount * 1 + notInformedCount * -1 + informedCount * 0);
        }

        const averagePoints = members.length > 0 ? Math.round((totalPoints / members.length) * 10) / 10 : 0;

        teamPointsData.push({
          teamId: team._id,
          teamCode: team.teamCode,
          teamName: team.teamName,
          totalPoints,
          averagePoints,
          memberCount: members.length,
        });
      }
    }

    return NextResponse.json({
      totalTeams,
      totalMembers,
      sessionStatuses,
      flaggedMembers,
      attendanceTrends,
      teamPointsData,
      today: normalizedToday,
    });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Fetch dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
