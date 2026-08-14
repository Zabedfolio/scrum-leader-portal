import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Team from '@/models/Team';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    await requireAuth();
    await connectDB();

    const teams = await Team.find({}).sort({ teamCode: 1 });
    return NextResponse.json(teams);
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Fetch teams error:', error);
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

    const { teamCode, teamName } = await request.json();

    if (!teamCode || !teamName) {
      return NextResponse.json(
        { error: 'Team code and team name are required' },
        { status: 400 }
      );
    }

    // Check duplicate team code
    const existing = await Team.findOne({ teamCode: teamCode.trim() });
    if (existing) {
      return NextResponse.json(
        { error: 'Team code already exists' },
        { status: 409 }
      );
    }

    const team = await Team.create({
      teamCode: teamCode.trim(),
      teamName: teamName.trim(),
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
