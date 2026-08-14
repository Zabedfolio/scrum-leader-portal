import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ScrumSession from '@/models/ScrumSession';
import Team from '@/models/Team';
import Member from '@/models/Member';
import AttendanceRecord from '@/models/AttendanceRecord';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { token } = await params;

    // Check if device is already checked in for this token session via Cookie
    const alreadyCheckedIn = request.cookies.get(`checked_in_${token}`)?.value;
    if (alreadyCheckedIn) {
      const sessions = await ScrumSession.find({ checkInToken: token });
      if (sessions.length > 0) {
        return NextResponse.json({
          alreadyCheckedInOnDevice: true,
          sessionType: sessions[0].sessionType,
          date: sessions[0].date,
          isTeamOnly: sessions[0].isTeamOnly,
        });
      }
    }

    // Find sessions that share this token
    const sessions = await ScrumSession.find({ checkInToken: token });
    if (sessions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid check-in link. Please check with your Scrum Leader.' },
        { status: 404 }
      );
    }

    // Verify token expiration
    const firstSession = sessions[0];
    if (
      firstSession.checkInTokenExpiresAt &&
      new Date() > new Date(firstSession.checkInTokenExpiresAt)
    ) {
      return NextResponse.json(
        { error: 'This check-in link has expired. Please contact your Scrum Leader.' },
        { status: 400 }
      );
    }

    // Verify if all teams are locked
    const allLocked = sessions.every((s) => s.locked);
    if (allLocked) {
      return NextResponse.json(
        { error: 'This check-in session has ended.' },
        { status: 400 }
      );
    }

    // Gather active teams and members
    const activeTeams = [];
    for (const session of sessions) {
      if (session.locked) continue; // Do not show locked teams

      const team = await Team.findById(session.teamId);
      if (!team) continue;

      const members = await Member.find({ teamId: team._id, isActive: true }).sort({ name: 1 });

      const membersWithStatus = await Promise.all(
        members.map(async (m) => {
          const record = await AttendanceRecord.findOne({
            sessionId: session._id,
            memberId: m._id,
          });

          return {
            _id: m._id,
            name: m.name,
            role: m.role,
            isCheckedIn: record ? record.status === 'present' : false,
          };
        })
      );

      activeTeams.push({
        _id: team._id,
        teamCode: team.teamCode,
        teamName: team.teamName,
        sessionId: session._id,
        members: membersWithStatus,
      });
    }

    return NextResponse.json({
      sessionType: firstSession.sessionType,
      date: firstSession.date,
      expiresAt: firstSession.checkInTokenExpiresAt,
      isTeamOnly: firstSession.isTeamOnly,
      teams: activeTeams,
    });
  } catch (error) {
    console.error('Fetch public checkin token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
