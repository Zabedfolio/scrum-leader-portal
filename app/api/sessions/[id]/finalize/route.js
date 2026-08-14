import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ScrumSession from '@/models/ScrumSession';
import AttendanceRecord from '@/models/AttendanceRecord';
import { requireAuth } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    await requireAuth();
    await connectDB();
    const { id } = await params;

    const session = await ScrumSession.findById(id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.locked) {
      return NextResponse.json(
        { success: true, message: 'Session is already locked', session }
      );
    }

    // 1. Get unresolved attendance records and convert them to 'absent_not_informed'
    // This will trigger the pre-validate hook in AttendanceRecord to set points = -1.
    // Note: The pre-save hooks on AttendanceRecord will verify session lock state.
    // Since session.locked is still false, the pre-save lock check will PASS!
    const unresolvedRecords = await AttendanceRecord.find({
      sessionId: session._id,
      status: 'unresolved',
    });

    for (const record of unresolvedRecords) {
      record.status = 'absent_not_informed';
      // points will be set to -1 automatically via the 'validate' hook
      await record.save();
    }

    // 2. Lock the session and invalidate the token
    session.locked = true;
    session.lockedAt = new Date();
    session.checkInTokenExpiresAt = new Date(0); // Immediately expire the token
    await session.save();

    return NextResponse.json({
      success: true,
      message: 'Session finalized and locked successfully.',
      session,
    });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Finalize session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
