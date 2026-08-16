import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SurveyResponse from '@/models/SurveyResponse';
import Team from '@/models/Team';
import Member from '@/models/Member';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      memberId,
      email,
      idToken,
      teamId,
      role,
      standup11AmSuitable,
      standup11AmNotSuitableReason,
      standup11AmNotSuitableReasonOther,
      standup830PmSuitable,
      standup830PmNotSuitableReason,
      standup830PmNotSuitableReasonOther,
      classes1030To1200,
      classes1030To1200Days,
      commitment800To930,
      commitment800To930Details,
      preferredTime,
      preferredDays,
      concernsOrSuggestions,
      otherRemarks,
    } = body;

    // Validate required fields
    if (
      !memberId ||
      !teamId ||
      !role ||
      !standup11AmSuitable ||
      !standup830PmSuitable ||
      !classes1030To1200 ||
      !commitment800To930 ||
      !preferredDays
    ) {
      return NextResponse.json(
        { error: 'Please complete all required fields.' },
        { status: 400 }
      );
    }

    // Verify teamId is valid
    const teamExists = await Team.findById(teamId);
    if (!teamExists) {
      return NextResponse.json(
        { error: 'Selected team does not exist in the database.' },
        { status: 400 }
      );
    }

    // Fetch member
    const member = await Member.findById(memberId);
    if (!member) {
      return NextResponse.json(
        { error: 'Selected member does not exist in the database.' },
        { status: 404 }
      );
    }

    // Gmail Confirmation Identity Verification
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
          error: `Verification failed: Your logged-in email (${verifiedEmail}) does not match your registered email.`
        }, { status: 400 });
      }
    }

    // Create the survey response
    const surveyResponse = await SurveyResponse.create({
      fullName: member.name,
      memberId,
      teamId,
      role,
      standup11AmSuitable,
      standup11AmNotSuitableReason: standup11AmSuitable !== 'Yes, always available' ? standup11AmNotSuitableReason || [] : [],
      standup11AmNotSuitableReasonOther: (standup11AmSuitable !== 'Yes, always available' && standup11AmNotSuitableReason?.includes('Other')) ? standup11AmNotSuitableReasonOther?.trim() || '' : '',
      standup830PmSuitable,
      standup830PmNotSuitableReason: standup830PmSuitable !== 'Yes, always available' ? standup830PmNotSuitableReason || [] : [],
      standup830PmNotSuitableReasonOther: (standup830PmSuitable !== 'Yes, always available' && standup830PmNotSuitableReason?.includes('Other')) ? standup830PmNotSuitableReasonOther?.trim() || '' : '',
      classes1030To1200,
      classes1030To1200Days: classes1030To1200 !== 'No' ? classes1030To1200Days || [] : [],
      commitment800To930,
      commitment800To930Details: commitment800To930 !== 'No' ? commitment800To930Details?.trim() || '' : '',
      preferredTime: preferredTime?.trim() || '',
      preferredDays,
      concernsOrSuggestions: concernsOrSuggestions?.trim() || '',
      otherRemarks: otherRemarks?.trim() || '',
    });

    return NextResponse.json(
      { message: 'Survey submitted successfully!', data: surveyResponse },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create survey response error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
