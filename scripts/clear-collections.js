const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Parse .env.local manually to get MONGODB_URI
const envPath = path.join(__dirname, '../.env.local');
let MONGODB_URI = '';

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

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Inline schemas for operations
const TeamSchema = new mongoose.Schema({ teamCode: String, teamName: String });
const MemberSchema = new mongoose.Schema({ name: String, teamId: mongoose.Schema.Types.ObjectId, isActive: Boolean });
const AdminSchema = new mongoose.Schema({ name: String, email: String, passwordHash: String, role: String });
const ScrumSessionSchema = new mongoose.Schema({ date: Date, sessionType: String, teamId: mongoose.Schema.Types.ObjectId });
const AttendanceRecordSchema = new mongoose.Schema({ sessionId: mongoose.Schema.Types.ObjectId, memberId: mongoose.Schema.Types.ObjectId });

const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);
const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
const ScrumSession = mongoose.models.ScrumSession || mongoose.model('ScrumSession', ScrumSessionSchema);
const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', AttendanceRecordSchema);

async function clearData() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  console.log('Clearing Teams data...');
  await Team.deleteMany({});

  console.log('Clearing Members data...');
  await Member.deleteMany({});

  console.log('Clearing Scrum Sessions...');
  await ScrumSession.deleteMany({});

  console.log('Clearing Attendance Records...');
  await AttendanceRecord.deleteMany({});

  console.log('Resetting Admin credentials...');
  await Admin.deleteMany({});
  
  const passwordHash = await bcrypt.hash('zabedfolio12345', 10);
  await Admin.create({
    name: 'Scrum Leader',
    email: 'zabedfolio@gmail.com',
    passwordHash: passwordHash,
    role: 'scrum_leader'
  });
  console.log('Admin user re-seeded: zabedfolio@gmail.com / zabedfolio12345');

  console.log('\n🌟 SUCCESS: Database successfully cleared of all teams and member records.');
  await mongoose.disconnect();
}

clearData().catch((err) => {
  console.error('Failed to clear database:', err);
  process.exit(1);
});
