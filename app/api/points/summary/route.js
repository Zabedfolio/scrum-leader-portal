import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Member from '@/models/Member';
import Team from '@/models/Team';
import AttendanceRecord from '@/models/AttendanceRecord';
import ScrumSession from '@/models/ScrumSession';
import { requireAuth } from '@/lib/auth';
import { getWeekBoundariesBD } from '@/lib/time';

export async function GET(request) {
  try {
    await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const isTeamOnlyParam = searchParams.get('isTeamOnly');
    const isTeamOnly = isTeamOnlyParam === 'true';

    // Get current week boundaries in UTC (derived from BST)
    const { startOfWeek, endOfWeek } = getWeekBoundariesBD(new Date());

    const memberQuery = { isActive: true };
    if (teamId) {
      memberQuery.teamId = teamId;
    }

    const members = await Member.find(memberQuery).populate('teamId').sort({ name: 1 });

    // Fetch session IDs corresponding to active platform mode
    const platformSessions = await ScrumSession.find({ isTeamOnly });
    const platformSessionIds = platformSessions.map(s => s._id);

    const summary = await Promise.all(
      members.map(async (member) => {
        // Fetch all attendance records for this member in this platform mode
        const allRecords = await AttendanceRecord.find({
          memberId: member._id,
          sessionId: { $in: platformSessionIds },
        });

        // Fetch weekly attendance records for this member
        const weeklyRecords = await Promise.all(
          allRecords.map(async (rec) => {
            const session = await ScrumSession.findById(rec.sessionId);
            if (session && session.date >= startOfWeek && session.date <= endOfWeek) {
              return rec;
            }
            return null;
          })
        ).then((results) => results.filter((r) => r !== null));

        // 1. All-time aggregates
        let presentCount = 0;
        let notInformedCount = 0;
        let informedCount = 0;
        let unresolvedCount = 0;

        allRecords.forEach((rec) => {
          if (rec.status === 'present') presentCount++;
          else if (rec.status === 'absent_not_informed') notInformedCount++;
          else if (rec.status === 'absent_informed') informedCount++;
          else unresolvedCount++;
        });

        const totalPoints = presentCount * 1 + notInformedCount * -1 + informedCount * 0;

        // 2. Weekly aggregates
        let weeklyPresent = 0;
        let weeklyNotInformed = 0;
        let weeklyInformed = 0;

        weeklyRecords.forEach((rec) => {
          if (rec.status === 'present') weeklyPresent++;
          else if (rec.status === 'absent_not_informed') weeklyNotInformed++;
          else if (rec.status === 'absent_informed') weeklyInformed++;
        });

        const weeklyPoints = weeklyPresent * 1 + weeklyNotInformed * -1 + weeklyInformed * 0;
        const weeklyAbsences = weeklyNotInformed + weeklyInformed; // both types count as absences

        // 3. Flagging logic
        // - Weekly absence flag: >= 2 absences (Informed or Not Informed combined) inside current week
        const weeklyRedFlag = weeklyAbsences >= 2;

        // - Removal-threshold badge (all-time):
        //   Orange warning badge if cumulative "Not Informed" count reaches exactly -3 points (i.e. 3 absences)
        //   Red "At Risk of Removal" badge if cumulative "Not Informed" count reaches or exceeds -4 points (4 or more absences)
        let riskStatus = 'none'; // 'none', 'warning' (orange), 'at_risk' (red)
        if (notInformedCount === 3) {
          riskStatus = 'warning';
        } else if (notInformedCount >= 4) {
          riskStatus = 'at_risk';
        }

        return {
          member: {
            _id: member._id,
            name: member.name,
            role: member.role,
            email: member.email,
            phone: member.phone,
            isActive: member.isActive,
          },
          team: member.teamId
            ? {
                _id: member.teamId._id,
                teamCode: member.teamId.teamCode,
                teamName: member.teamId.teamName,
              }
            : null,
          totalSessions: allRecords.length,
          presentCount,
          notInformedCount,
          informedCount,
          unresolvedCount,
          totalPoints,
          weeklyPoints,
          weeklyAbsences,
          weeklyRedFlag,
          riskStatus,
        };
      })
    );

    return NextResponse.json(summary);
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Fetch points summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
