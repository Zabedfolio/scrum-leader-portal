import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Member from '@/models/Member';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    const members = await Member.find({ teamId, isActive: true })
      .select('_id name email role')
      .sort({ name: 1 });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Fetch public members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
