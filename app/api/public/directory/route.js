import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Admin from '@/models/Admin';
import Member from '@/models/Member';
import Team from '@/models/Team';
import AttendanceRecord from '@/models/AttendanceRecord';
import ScrumSession from '@/models/ScrumSession';

export async function GET() {
  try {
    await connectDB();

    // Fetch all admins
    const admins = await Admin.find({}).select('name email role');
    
    // Fetch all active members
    const members = await Member.find({ isActive: true })
      .populate('teamId')
      .select('name email role teamId');

    // Fetch all active session IDs to filter out deleted/orphan records
    const activeSessions = await ScrumSession.find({}).select('_id');
    const activeSessionIds = activeSessions.map(s => s._id);

    const mergedAdminIds = new Set();
    const directory = [];

    // 1. Process active team members and check if they overlap with admin accounts (matching email or name)
    for (const member of members) {
      // Calculate member points (only counting records for active sessions)
      const records = await AttendanceRecord.find({ 
        memberId: member._id,
        sessionId: { $in: activeSessionIds }
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

      const memberEmailLower = member.email ? member.email.toLowerCase().trim() : '';
      const memberNameLower = member.name ? member.name.toLowerCase().trim() : '';

      const matchedAdmin = admins.find(a => {
        const adminEmailMatch = memberEmailLower && a.email.toLowerCase().trim() === memberEmailLower;
        const adminNameMatch = memberNameLower && a.name.toLowerCase().trim() === memberNameLower;
        return adminEmailMatch || adminNameMatch;
      });

      if (matchedAdmin) {
        // Double role merge
        let displayRole = 'Member';
        if (matchedAdmin.role === 'scrum_leader' && member.role === 'team_leader') {
          displayRole = 'Scrum Leader & Team Leader';
        } else if (matchedAdmin.role === 'scrum_leader') {
          displayRole = 'Scrum Leader';
        } else if (matchedAdmin.role === 'co_admin' && member.role === 'team_leader') {
          displayRole = 'Co-Admin & Team Leader';
        } else if (matchedAdmin.role === 'co_admin') {
          displayRole = 'Co-Admin';
        }

        directory.push({
          _id: member._id,
          name: member.name,
          email: member.email || matchedAdmin.email,
          role: displayRole,
          type: 'member', // Allow edit/delete as member
          teamCode: member.teamId?.teamCode || 'N/A',
          teamName: member.teamId?.teamName || 'Unassigned',
          points: totalPoints,
          isDoubleRole: true,
        });

        mergedAdminIds.add(matchedAdmin._id.toString());
      } else {
        // Regular member
        directory.push({
          _id: member._id,
          name: member.name,
          email: member.email,
          role: member.role === 'team_leader' ? 'Team Leader' : 'Member',
          type: 'member',
          teamCode: member.teamId?.teamCode || 'N/A',
          teamName: member.teamId?.teamName || 'Unassigned',
          points: totalPoints,
        });
      }
    }

    // 2. Add remaining admins who are not merged with any team member profile
    for (const admin of admins) {
      if (!mergedAdminIds.has(admin._id.toString())) {
        directory.push({
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role === 'scrum_leader' ? 'Scrum Leader' : 'Co-Admin',
          type: 'admin',
          teamCode: 'ADMIN',
          teamName: 'Administration',
          points: null,
        });
      }
    }

    // Sort by role precedence: Scrum Leader, Co-Admin, Team Leader, Member
    const rolePrecedence = {
      'Scrum Leader': 1,
      'Co-Admin': 2,
      'Team Leader': 3,
      'Member': 4
    };

    directory.sort((a, b) => {
      const precA = rolePrecedence[a.role] || 5;
      const precB = rolePrecedence[b.role] || 5;
      if (precA !== precB) {
        return precA - precB;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(directory);
  } catch (error) {
    console.error('Fetch public directory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
