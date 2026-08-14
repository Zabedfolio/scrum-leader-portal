import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AttendanceRecord from '@/models/AttendanceRecord';
import ScrumSession from '@/models/ScrumSession';
import { requireAuth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    await requireAuth();
    await connectDB();
    const { id } = await params;
    const { reason, note, documentUrl } = await request.json();

    if (!reason) {
      return NextResponse.json(
        { error: 'Absence reason is required' },
        { status: 400 }
      );
    }

    const validReasons = ['Exam', 'Sickness', 'Family Emergency', 'Other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      );
    }

    const record = await AttendanceRecord.findById(id);
    if (!record) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // Explicit check for locking to return clean 403 Forbidden response
    const session = await ScrumSession.findById(record.sessionId);
    if (session && session.locked) {
      return NextResponse.json(
        { error: 'This session is locked and cannot be edited.' },
        { status: 403 }
      );
    }

    record.status = 'absent_informed';
    record.informedReason = reason;
    record.informedNote = note ? note.trim() : '';
    record.informedDocumentUrl = documentUrl ? documentUrl.trim() : '';
    record.markedBy = 'admin_manual';

    await record.save();
    return NextResponse.json(record);
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Mark informed error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
