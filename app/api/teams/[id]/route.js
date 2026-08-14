import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Team from '@/models/Team';
import Member from '@/models/Member';
import ScrumSession from '@/models/ScrumSession';
import { requireAuth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    await requireAuth();
    await connectDB();
    const { id } = await params;
    const { teamCode, teamName } = await request.json();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (teamCode && teamCode.trim() !== team.teamCode) {
      const existing = await Team.findOne({ teamCode: teamCode.trim() });
      if (existing) {
        return NextResponse.json(
          { error: 'Team code already exists' },
          { status: 409 }
        );
      }
      team.teamCode = teamCode.trim();
    }

    if (teamName) {
      team.teamName = teamName.trim();
    }

    await team.save();
    return NextResponse.json(team);
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update team error:', error);
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

    // Check if any members belong to this team
    const memberCount = await Member.countDocuments({ teamId: id });
    if (memberCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete team: active members are registered to it.' },
        { status: 400 }
      );
    }

    // Check if any sessions belong to this team
    const sessionCount = await ScrumSession.countDocuments({ teamId: id });
    if (sessionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete team: scrum session records exist for it.' },
        { status: 400 }
      );
    }

    const team = await Team.findByIdAndDelete(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
