import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Member from '@/models/Member';
import Team from '@/models/Team';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    const query = {};
    if (teamId) {
      query.teamId = teamId;
    }

    const members = await Member.find(query).populate('teamId').sort({ name: 1 });
    return NextResponse.json(members);
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Fetch members error:', error);
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

    const { name, teamId, email, phone, role, isActive } = await request.json();

    if (!name || !teamId) {
      return NextResponse.json(
        { error: 'Name and teamId are required' },
        { status: 400 }
      );
    }

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const member = await Member.create({
      name: name.trim(),
      teamId,
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : '',
      role: role || 'member',
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
