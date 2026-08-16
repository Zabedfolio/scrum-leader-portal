import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Team from '@/models/Team';

export async function GET() {
  try {
    await connectDB();

    const teams = await Team.find({}).sort({ teamCode: 1 });
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Fetch public teams error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
