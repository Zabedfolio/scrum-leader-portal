const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Parse .env.local manually to get MONGODB_URI
const envPath = path.join(__dirname, '../.env.local');
let MONGODB_URI = 'mongodb://localhost:27017/scrum-dashboard';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] ? match[2].trim() : '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (key === 'MONGODB_URI') {
        MONGODB_URI = value;
      }
    }
  });
}

console.log('Connecting to database:', MONGODB_URI);

// Define Schemas inline to prevent ESM require conflicts
const TeamSchema = new mongoose.Schema({
  teamCode: { type: String, required: true, unique: true },
  teamName: { type: String, required: true }
});

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  email: { type: String },
  phone: { type: String },
  role: { type: String, enum: ['member', 'team_leader'], default: 'member' },
  isActive: { type: Boolean, default: true }
});

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['scrum_leader', 'co_admin'], default: 'scrum_leader' }
});

const ScrumSessionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  sessionType: { type: String, enum: ['Day', 'Afternoon'], required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  locked: { type: Boolean, default: false },
  lockedAt: { type: Date, default: null }
});

const AttendanceRecordSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScrumSession', required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  status: { type: String, enum: ['present', 'absent_not_informed', 'absent_informed', 'unresolved'], default: 'unresolved' },
  points: { type: Number, required: true, default: 0 }
});

const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);
const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
const ScrumSession = mongoose.models.ScrumSession || mongoose.model('ScrumSession', ScrumSessionSchema);
const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', AttendanceRecordSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  // Clean collections
  console.log('Cleaning existing data...');
  await Team.deleteMany({});
  await Member.deleteMany({});
  await Admin.deleteMany({});
  await ScrumSession.deleteMany({});
  await AttendanceRecord.deleteMany({});

  // Seed Admin
  console.log('Seeding Scrum Leader Admin...');
  const passwordHash = await bcrypt.hash('zabedfolio12345', 10);
  await Admin.create({
    name: 'Scrum Leader',
    email: 'zabedfolio@gmail.com',
    passwordHash: passwordHash,
    role: 'scrum_leader'
  });
  console.log('Admin seeded: zabedfolio@gmail.com / zabedfolio12345');

  // Seed Teams
  console.log('Seeding Teams...');
  const teamsData = [
    { teamCode: '1301.1', teamName: 'Alpha Guardians' },
    { teamCode: '1301.2', teamName: 'Beta Titans' },
    { teamCode: '1301.3', teamName: 'Gamma Voyagers' },
    { teamCode: '1301.4', teamName: 'Delta Rangers' }
  ];

  const createdTeams = [];
  for (const team of teamsData) {
    const t = await Team.create(team);
    createdTeams.push(t);
    console.log(`Seeded team: ${t.teamCode} (${t.teamName})`);
  }

  // Seed Members (5 members per team)
  console.log('Seeding Members...');
  const membersMock = [
    // Team 1301.1
    { name: 'Zabed Mahmud', email: 'zabed@scrum.local', phone: '+8801700000001', role: 'team_leader' },
    { name: 'Anisur Rahman', email: 'anisur@scrum.local', phone: '+8801700000002', role: 'member' },
    { name: 'Fahim Shakil', email: 'fahim@scrum.local', phone: '+8801700000003', role: 'member' },
    { name: 'Sadia Islam', email: 'sadia@scrum.local', phone: '+8801700000004', role: 'member' },
    { name: 'Mahbub Alam', email: 'mahbub@scrum.local', phone: '+8801700000005', role: 'member' },

    // Team 1301.2
    { name: 'Imran Hossen', email: 'imran@scrum.local', phone: '+8801700000006', role: 'team_leader' },
    { name: 'Nabila Afrin', email: 'nabila@scrum.local', phone: '+8801700000007', role: 'member' },
    { name: 'Rashedul Islam', email: 'rashed@scrum.local', phone: '+8801700000008', role: 'member' },
    { name: 'Tasmia Jahan', email: 'tasmia@scrum.local', phone: '+8801700000009', role: 'member' },
    { name: 'Sajid Hasan', email: 'sajid@scrum.local', phone: '+8801700000010', role: 'member' },

    // Team 1301.3
    { name: 'Arifur Rahman', email: 'arif@scrum.local', phone: '+8801700000011', role: 'team_leader' },
    { name: 'Nusrat Jahan', email: 'nusrat@scrum.local', phone: '+8801700000012', role: 'member' },
    { name: 'Sabbir Hossain', email: 'sabbir@scrum.local', phone: '+8801700000013', role: 'member' },
    { name: 'Jannatul Ferdous', email: 'jannat@scrum.local', phone: '+8801700000014', role: 'member' },
    { name: 'Kamrul Hasan', email: 'kamrul@scrum.local', phone: '+8801700000015', role: 'member' },

    // Team 1301.4
    { name: 'Asif Iqbal', email: 'asif@scrum.local', phone: '+8801700000016', role: 'team_leader' },
    { name: 'Maimuna Akter', email: 'maimuna@scrum.local', phone: '+8801700000017', role: 'member' },
    { name: 'Shakil Ahmed', email: 'shakil@scrum.local', phone: '+8801700000018', role: 'member' },
    { name: 'Riffat Sultana', email: 'riffat@scrum.local', phone: '+8801700000019', role: 'member' },
    { name: 'Tanvir Hossain', email: 'tanvir@scrum.local', phone: '+8801700000020', role: 'member' }
  ];

  for (let i = 0; i < membersMock.length; i++) {
    const teamIndex = Math.floor(i / 5);
    const m = membersMock[i];
    m.teamId = createdTeams[teamIndex]._id;
    const createdMember = await Member.create(m);
    console.log(`Seeded member: ${createdMember.name} in team ${createdTeams[teamIndex].teamCode}`);
  }

  console.log('Seeding completed successfully.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
