import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SurveyResponse from '@/models/SurveyResponse';
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

    const responses = await SurveyResponse.find(query)
      .populate('teamId')
      .sort({ createdAt: -1 });

    return NextResponse.json(responses);
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Fetch survey responses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
