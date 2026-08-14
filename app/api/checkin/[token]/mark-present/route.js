import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ScrumSession from '@/models/ScrumSession';
import Member from '@/models/Member';
import AttendanceRecord from '@/models/AttendanceRecord';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { token } = await params;

    // Verify duplicate device check-in via cookie
    const alreadyCheckedIn = request.cookies.get(`checked_in_${token}`)?.value;
    if (alreadyCheckedIn) {
      return NextResponse.json(
        { error: 'This device has already checked in for this session. Proxy submissions are not allowed.' },
        { status: 403 }
      );
    }

    const { memberId, email, idToken } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Verify member email to prevent proxy submissions from other browsers
    if (member.email) {
      let verifiedEmail = email;

      if (idToken) {
        try {
          const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
          if (verifyRes.ok) {
            const payload = await verifyRes.json();
            verifiedEmail = payload.email;
          } else {
            return NextResponse.json({ error: 'Invalid Google identity token.' }, { status: 400 });
          }
        } catch (err) {
          console.error('Google token verify error:', err);
          return NextResponse.json({ error: 'Failed to verify Google identity.' }, { status: 500 });
        }
      }

      if (!verifiedEmail) {
        return NextResponse.json({ error: 'Verification required: Please verify your registered email.' }, { status: 400 });
      }

      if (member.email.trim().toLowerCase() !== verifiedEmail.trim().toLowerCase()) {
        return NextResponse.json({
          error: `Verification failed: Your logged-in email (${verifiedEmail}) does not match this member's registered email.`
        }, { status: 400 });
      }
    }

    // Find the session for this member's team sharing this checkInToken
    const session = await ScrumSession.findOne({
      checkInToken: token,
      teamId: member.teamId,
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid check-in link for your team.' },
        { status: 400 }
      );
    }

    // Verify session lock
    if (session.locked) {
      return NextResponse.json(
        { error: 'This session has already been finalized.' },
        { status: 403 }
      );
    }

    // Verify expiration
    if (
      session.checkInTokenExpiresAt &&
      new Date() > new Date(session.checkInTokenExpiresAt)
    ) {
      return NextResponse.json(
        { error: 'This check-in link has expired.' },
        { status: 400 }
      );
    }

    // Fetch or create attendance record
    let record = await AttendanceRecord.findOne({
      sessionId: session._id,
      memberId: member._id,
    });

    if (record && record.status === 'present') {
      return NextResponse.json({
        success: true,
        alreadyMarked: true,
        message: 'You have already checked in!',
        record,
      });
    }

    if (!record) {
      record = new AttendanceRecord({
        sessionId: session._id,
        memberId: member._id,
      });
    }

    record.status = 'present';
    record.markedBy = 'self_checkin';
    record.checkedInAt = new Date();

    await record.save();

    const response = NextResponse.json({
      success: true,
      alreadyMarked: false,
      message: 'Successfully marked present!',
      record,
    });

    response.cookies.set(`checked_in_${token}`, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Public checkin submit present error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
