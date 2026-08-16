import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SurveyResponse from '@/models/SurveyResponse';
import Team from '@/models/Team';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      fullName,
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
      !fullName ||
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

    // Create the survey response
    const surveyResponse = await SurveyResponse.create({
      fullName: fullName.trim(),
      teamId,
      role,
      standup11AmSuitable,
      standup11AmNotSuitableReason: standup11AmNotSuitableReason || [],
      standup11AmNotSuitableReasonOther: standup11AmNotSuitableReasonOther?.trim() || '',
      standup830PmSuitable,
      standup830PmNotSuitableReason: standup830PmNotSuitableReason || [],
      standup830PmNotSuitableReasonOther: standup830PmNotSuitableReasonOther?.trim() || '',
      classes1030To1200,
      classes1030To1200Days: classes1030To1200Days || [],
      commitment800To930,
      commitment800To930Details: commitment800To930Details?.trim() || '',
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
