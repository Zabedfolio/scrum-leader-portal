import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import ScrumSession from '@/models/ScrumSession';
import Team from '@/models/Team';
import Member from '@/models/Member';
import AttendanceRecord from '@/models/AttendanceRecord';
import Admin from '@/models/Admin';
import { requireAuth } from '@/lib/auth';
import { getStartOfDayBDinUTC } from '@/lib/time';

export async function POST(request) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { date, sessionType, isTeamOnly } = await request.json();

    if (!date || !sessionType) {
      return NextResponse.json(
        { error: 'Date and Session Time/Label are required' },
        { status: 400 }
      );
    }

    if (!isTeamOnly && !['Day', 'Afternoon'].includes(sessionType)) {
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

    // Fetch target teams
    let targetTeams = [];
    if (isTeamOnly) {
      const admin = await Admin.findById(user.id);
      if (!admin || !admin.myTeamId) {
        return NextResponse.json(
          { error: 'Please configure your designated team in Settings before generating Team-Only sessions.' },
          { status: 400 }
        );
      }
      const myTeam = await Team.findById(admin.myTeamId);
      if (!myTeam) {
        return NextResponse.json({ error: 'Designated team not found.' }, { status: 404 });
      }
      targetTeams = [myTeam];
    } else {
      targetTeams = await Team.find({});
      if (targetTeams.length === 0) {
        return NextResponse.json(
          { error: 'No teams configured in the system. Add teams first.' },
          { status: 400 }
        );
      }
    }

    const sessions = [];

    // Create or update sessions for target teams
    for (const team of targetTeams) {
      // Find or create session
      let session = await ScrumSession.findOne({
        date: normalizedDate,
        sessionType,
        teamId: team._id,
        isTeamOnly: !!isTeamOnly,
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
          isTeamOnly: !!isTeamOnly,
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
