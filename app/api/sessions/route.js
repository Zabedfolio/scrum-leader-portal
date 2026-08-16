import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ScrumSession from '@/models/ScrumSession';
import AttendanceRecord from '@/models/AttendanceRecord';
import Member from '@/models/Member';
import { requireAuth } from '@/lib/auth';
import { getStartOfDayBDinUTC } from '@/lib/time';

export async function GET(request) {
  try {
    await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    const isTeamOnlyParam = searchParams.get('isTeamOnly');
    const isTeamOnly = isTeamOnlyParam === 'true';

    const query = { teamId, isTeamOnly };

    if (startDateParam || endDateParam) {
      query.date = {};
      if (startDateParam) {
        query.date.$gte = getStartOfDayBDinUTC(startDateParam);
      }
      if (endDateParam) {
        query.date.$lte = getStartOfDayBDinUTC(endDateParam);
      }
    }

    const sessions = await ScrumSession.find(query).sort({ date: 1, sessionType: 1 });

    // Backfill missing attendance records for open sessions and return them with populated records
    const sessionsWithRecords = await Promise.all(
      sessions.map(async (session) => {
        const activeMembers = await Member.find({ teamId: session.teamId, isActive: true });

        // If the session is open (not locked), ensure all active members have records
        if (!session.locked) {
          for (const member of activeMembers) {
            const existingRecord = await AttendanceRecord.findOne({
              sessionId: session._id,
              memberId: member._id,
            });

            if (!existingRecord) {
              await AttendanceRecord.create({
                sessionId: session._id,
                memberId: member._id,
                status: 'unresolved',
                points: 0,
              });
            }
          }
        }

        // Fetch and populate records for the session
        const records = await AttendanceRecord.find({ sessionId: session._id }).populate('memberId');

        return {
          ...session.toObject(),
          records,
        };
      })
    );

    return NextResponse.json(sessionsWithRecords);
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Fetch sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await requireAuth();
    await connectDB();

    const { teamId, date, sessionType, isTeamOnly } = await request.json();

    if (!teamId || !date || !sessionType) {
      return NextResponse.json(
        { error: 'Team, Date, and Session Type are required.' },
        { status: 400 }
      );
    }

    const normalizedDate = getStartOfDayBDinUTC(date);

    // Check duplicate session
    const existing = await ScrumSession.findOne({
      date: normalizedDate,
      sessionType,
      teamId,
      isTeamOnly: !!isTeamOnly,
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A session with this type already exists for this date and team.' },
        { status: 409 }
      );
    }

    // Create session
    const session = await ScrumSession.create({
      date: normalizedDate,
      sessionType,
      teamId,
      isTeamOnly: !!isTeamOnly,
      locked: false,
    });

    // Backfill records for active members of this team
    const activeMembers = await Member.find({ teamId, isActive: true });
    for (const member of activeMembers) {
      await AttendanceRecord.create({
        sessionId: session._id,
        memberId: member._id,
        status: 'unresolved',
        points: 0,
      });
    }

    // Fetch and populate records for the session to return it fully formed
    const records = await AttendanceRecord.find({ sessionId: session._id }).populate('memberId');
    const result = {
      ...session.toObject(),
      records,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create manual session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
