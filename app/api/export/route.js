import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Member from '@/models/Member';
import AttendanceRecord from '@/models/AttendanceRecord';
import Team from '@/models/Team';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const isTeamOnlyParam = searchParams.get('isTeamOnly');
    const isTeamOnly = isTeamOnlyParam === 'true';

    const memberQuery = { isActive: true };
    if (teamId) {
      memberQuery.teamId = teamId;
    }

    const members = await Member.find(memberQuery).populate('teamId').sort({ name: 1 });

    // Fetch session IDs corresponding to active platform mode
    const ScrumSession = require('@/models/ScrumSession').default || require('@/models/ScrumSession');
    const platformSessions = await ScrumSession.find({ isTeamOnly });
    const platformSessionIds = platformSessions.map(s => s._id);

    // Generate CSV content
    const csvRows = [];
    
    // Header Row
    csvRows.push([
      'Member Name',
      'Team Code',
      'Team Name',
      'Total Sessions',
      'Present Count',
      'Absent (Not Informed) Count',
      'Absent (Informed) Count',
      'Total Points'
    ].join(','));

    for (const member of members) {
      const records = await AttendanceRecord.find({
        memberId: member._id,
        sessionId: { $in: platformSessionIds },
      });
      
      let presentCount = 0;
      let notInformedCount = 0;
      let informedCount = 0;

      records.forEach((rec) => {
        if (rec.status === 'present') presentCount++;
        else if (rec.status === 'absent_not_informed') notInformedCount++;
        else if (rec.status === 'absent_informed') informedCount++;
      });

      const totalPoints = presentCount * 1 + notInformedCount * -1 + informedCount * 0;
      const teamCode = member.teamId ? member.teamId.teamCode : 'N/A';
      const teamName = member.teamId ? member.teamId.teamName.replace(/"/g, '""') : 'N/A';
      const memberName = member.name.replace(/"/g, '""');

      // Add double quotes around string columns to prevent comma splitting issues
      csvRows.push([
        `"${memberName}"`,
        `"${teamCode}"`,
        `"${teamName}"`,
        records.length,
        presentCount,
        notInformedCount,
        informedCount,
        totalPoints
      ].join(','));
    }

    const csvString = csvRows.join('\n');

    // Create and return the text/csv response with attachment disposition
    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=scrum_attendance_points_report.csv',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
