import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import ScrumSession from '@/models/ScrumSession';
import Team from '@/models/Team';
import Member from '@/models/Member';
import AttendanceRecord from '@/models/AttendanceRecord';
import { requireAuth } from '@/lib/auth';
import { getStartOfDayBDinUTC } from '@/lib/time';

export async function POST(request) {
  try {
    await requireAuth();
    await connectDB();

    const { date, sessionType } = await request.json();

    if (!date || !sessionType) {
      return NextResponse.json(
        { error: 'Date and sessionType (Day/Afternoon) are required' },
        { status: 400 }
      );
    }

    if (!['Day', 'Afternoon'].includes(sessionType)) {
      return NextResponse.json(
        { error: 'sessionType must be either "Day" or "Afternoon"' },
        { status: 400 }
      );
    }

    // Normalize date to start of BST day, represented in UTC
    const normalizedDate = getStartOfDayBDinUTC(date);

    // Generate shared check-in token and expiration
    const token = crypto.randomUUID();
    const expiryMinutes = parseInt(process.env.CHECKIN_LINK_EXPIRY_MINUTES || '45', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Fetch all teams
    const teams = await Team.find({});
    if (teams.length === 0) {
      return NextResponse.json(
        { error: 'No teams configured in the system. Add teams first.' },
        { status: 400 }
      );
    }

    const sessions = [];

    // Create or update sessions for all teams
    for (const team of teams) {
      // Find or create session
      let session = await ScrumSession.findOne({
        date: normalizedDate,
        sessionType,
        teamId: team._id,
      });

      if (session) {
        // If session is already locked, don't update token
        if (!session.locked) {
          session.checkInToken = token;
          session.checkInTokenExpiresAt = expiresAt;
          await session.save();
        }
      } else {
        session = await ScrumSession.create({
          date: normalizedDate,
          sessionType,
          teamId: team._id,
          checkInToken: token,
          checkInTokenExpiresAt: expiresAt,
        });
      }

      sessions.push(session);

      // Backfill unresolved records for active members of this team
      const activeMembers = await Member.find({ teamId: team._id, isActive: true });
      for (const member of activeMembers) {
        const existingRecord = await AttendanceRecord.findOne({
          sessionId: session._id,
          memberId: member._id,
        });

        if (!existingRecord) {
          await AttendanceRecord.create({
            sessionId: session._id,
            memberId: member._id,
            status: 'unresolved',
            points: 0,
          });
        }
      }
    }

    // Base URL configuration for sharing links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const checkInUrl = `${baseUrl}/checkin/${token}`;

    return NextResponse.json({
      success: true,
      token,
      checkInUrl,
      expiresAt,
      sessionType,
      date: normalizedDate,
    });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Generate check-in link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
