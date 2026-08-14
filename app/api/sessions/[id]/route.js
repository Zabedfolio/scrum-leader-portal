import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ScrumSession from '@/models/ScrumSession';
import AttendanceRecord from '@/models/AttendanceRecord';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await requireAuth();
    await connectDB();
    const { id } = await params;

    const session = await ScrumSession.findById(id).populate('teamId');
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const records = await AttendanceRecord.find({ sessionId: id })
      .populate('memberId')
      .sort({ 'memberId.name': 1 });

    return NextResponse.json({
      session,
      records,
    });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
