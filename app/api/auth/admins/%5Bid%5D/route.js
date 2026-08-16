import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Admin from '@/models/Admin';
import { requireAuth } from '@/lib/auth';

// DELETE /api/auth/admins/[id] - Remove an administrator account
export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth();
    await connectDB();

    const targetId = params.id;

    // Check if target is self
    if (user.id === targetId) {
      return NextResponse.json({ error: 'You cannot remove your own administrator account' }, { status: 400 });
    }

    const admin = await Admin.findById(targetId);
    if (!admin) {
      return NextResponse.json({ error: 'Administrator account not found' }, { status: 404 });
    }

    // Optional: Protect the primary scrum leader from deletion if desired
    // (For this project, we allow deleting other accounts, just prevent self-deletion)

    await Admin.findByIdAndDelete(targetId);

    return NextResponse.json({ message: 'Administrator account removed successfully' });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
