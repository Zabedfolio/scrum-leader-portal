import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Member from '@/models/Member';
import AttendanceRecord from '@/models/AttendanceRecord';
import { requireAuth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    await requireAuth();
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const member = await Member.findById(id);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Update fields
    if (body.name !== undefined) member.name = body.name.trim();
    if (body.teamId !== undefined) member.teamId = body.teamId;
    if (body.email !== undefined) member.email = body.email.trim();
    if (body.phone !== undefined) member.phone = body.phone.trim();
    if (body.role !== undefined) member.role = body.role;
    if (body.isActive !== undefined) member.isActive = body.isActive;

    await member.save();
    return NextResponse.json(member);
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth();
    await connectDB();
    const { id } = await params;

    const member = await Member.findById(id);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if member has attendance records
    const attendanceCount = await AttendanceRecord.countDocuments({ memberId: id });
    if (attendanceCount > 0) {
      // Soft delete: deactivate the member
      member.isActive = false;
      await member.save();
      return NextResponse.json({
        success: true,
        softDeleted: true,
        message: 'Member has attendance history. Deactivated successfully.',
        member,
      });
    } else {
      // Hard delete: no history exists
      await Member.findByIdAndDelete(id);
      return NextResponse.json({
        success: true,
        softDeleted: false,
        message: 'Member deleted successfully.',
      });
    }
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
