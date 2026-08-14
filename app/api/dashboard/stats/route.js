import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Team from '@/models/Team';
import Member from '@/models/Member';
import ScrumSession from '@/models/ScrumSession';
import AttendanceRecord from '@/models/AttendanceRecord';
import { requireAuth } from '@/lib/auth';
import { getStartOfDayBDinUTC, getWeekBoundariesBD } from '@/lib/time';

export async function GET() {
  try {
    await requireAuth();
    await connectDB();

    const todayDate = new Date();
    const normalizedToday = getStartOfDayBDinUTC(todayDate);

    // Get current week boundaries in UTC (derived from BST)
    const { startOfWeek, endOfWeek } = getWeekBoundariesBD(todayDate);

    // 1. Fetch quick counts
    const totalTeams = await Team.countDocuments();
    const totalMembers = await Member.countDocuments({ isActive: true });

    // 2. Fetch all teams
    const teams = await Team.find({}).sort({ teamCode: 1 });

    // 3. Compute session status for each team (Day & Afternoon) for today
    const sessionStatuses = await Promise.all(
      teams.map(async (team) => {
        const daySession = await ScrumSession.findOne({
          date: normalizedToday,
          sessionType: 'Day',
          teamId: team._id,
        });

        const afternoonSession = await ScrumSession.findOne({
          date: normalizedToday,
          sessionType: 'Afternoon',
          teamId: team._id,
        });

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
          return 'unfinalized'; // Created but link expired, waiting for final save
        };

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
        };
      })
    );

    // 4. Compute at-risk members list
    // - Weekly Red Flag: >= 2 absences in the current BST week
    // - All-time Warning: exactly 3 Not Informed absences
    // - All-time At Risk: >= 4 Not Informed absences
    const activeMembers = await Member.find({ isActive: true }).populate('teamId');
    const flaggedMembers = [];

    for (const member of activeMembers) {
      const allRecords = await AttendanceRecord.find({ memberId: member._id });

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

    return NextResponse.json({
      totalTeams,
      totalMembers,
      sessionStatuses,
      flaggedMembers,
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
