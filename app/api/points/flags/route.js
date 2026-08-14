import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Member from '@/models/Member';
import AttendanceRecord from '@/models/AttendanceRecord';
import ScrumSession from '@/models/ScrumSession';
import { requireAuth } from '@/lib/auth';
import { getWeekBoundariesBD } from '@/lib/time';

export async function GET() {
  try {
    await requireAuth();
    await connectDB();

    const { startOfWeek, endOfWeek } = getWeekBoundariesBD(new Date());

    const members = await Member.find({ isActive: true }).populate('teamId').sort({ name: 1 });

    const redFlagged = [];
    const warningBadges = [];
    const atRiskBadges = [];

    for (const member of members) {
      const allRecords = await AttendanceRecord.find({ memberId: member._id });

      // 1. Calculate all-time "Not Informed" count
      let notInformedCount = 0;
      allRecords.forEach((rec) => {
        if (rec.status === 'absent_not_informed') {
          notInformedCount++;
        }
      });

      if (notInformedCount === 3) {
        warningBadges.push({ member, notInformedCount });
      } else if (notInformedCount >= 4) {
        atRiskBadges.push({ member, notInformedCount });
      }

      // 2. Calculate weekly absences (Informed + Not Informed)
      let weeklyAbsences = 0;
      for (const rec of allRecords) {
        const session = await ScrumSession.findById(rec.sessionId);
        if (session && session.date >= startOfWeek && session.date <= endOfWeek) {
          if (rec.status === 'absent_not_informed' || rec.status === 'absent_informed') {
            weeklyAbsences++;
          }
        }
      }

      if (weeklyAbsences >= 2) {
        redFlagged.push({ member, weeklyAbsences });
      }
    }

    return NextResponse.json({
      redFlagged,
      warningBadges,
      atRiskBadges,
    });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Fetch flags error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
