const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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

// Inline schemas to avoid CommonJS/ESM conflicts
const TeamSchema = new mongoose.Schema({
  teamCode: { type: String, required: true, unique: true },
  teamName: { type: String, required: true },
});

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  isActive: { type: Boolean, default: true },
});

const ScrumSessionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  sessionType: { type: String, enum: ['Day', 'Afternoon'], required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  locked: { type: Boolean, default: false },
  lockedAt: { type: Date, default: null },
});

const AttendanceRecordSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScrumSession', required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  status: {
    type: String,
    enum: ['present', 'absent_not_informed', 'absent_informed', 'unresolved'],
    default: 'unresolved',
  },
  points: { type: Number, required: true, default: 0 },
});

// Calculate points dynamically
AttendanceRecordSchema.pre('validate', function () {
  if (this.status === 'present') {
    this.points = 1;
  } else if (this.status === 'absent_not_informed') {
    this.points = -1;
  } else if (this.status === 'absent_informed') {
    this.points = 0;
  } else {
    this.points = 0;
  }
});

// Middleware lock check
async function checkSessionLock(sessionId) {
  const ScrumSession = mongoose.model('ScrumSession');
  const session = await ScrumSession.findById(sessionId);
  if (session && session.locked) {
    throw new Error('This session is locked and cannot be modified.');
  }
}

AttendanceRecordSchema.pre('save', async function () {
  await checkSessionLock(this.sessionId);
});

AttendanceRecordSchema.pre('findOneAndUpdate', async function () {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate) {
    await checkSessionLock(docToUpdate.sessionId);
  }
});

const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);
const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);
const ScrumSession = mongoose.models.ScrumSession || mongoose.model('ScrumSession', ScrumSessionSchema);
const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', AttendanceRecordSchema);

async function runValidation() {
  await mongoose.connect(MONGODB_URI);
  console.log('--- Database Rule Validation Test ---');

  // Fetch a seeded team and member
  const team = await Team.findOne();
  const member = await Member.findOne({ teamId: team._id });
  
  if (!team || !member) {
    console.error('Seeded team or member not found. Run scripts/seed.js first.');
    process.exit(1);
  }

  console.log(`Using Team: ${team.teamCode}, Member: ${member.name}`);

  // 1. Create a test session
  const testSession = await ScrumSession.create({
    date: new Date('2026-12-25'),
    sessionType: 'Day',
    teamId: team._id,
    locked: false,
  });
  console.log('Created unlocked test session.');

  // 2. Validate points auto-calculation
  console.log('Testing points engine auto-calculations...');
  
  // Present (+1)
  let record = await AttendanceRecord.create({
    sessionId: testSession._id,
    memberId: member._id,
    status: 'present',
  });
  console.log(` -> Present status points: ${record.points} (Expected: 1)`);
  if (record.points !== 1) throw new Error('Present points calculation failed');

  // Absent Not Informed (-1)
  record.status = 'absent_not_informed';
  await record.save();
  console.log(` -> Absent Not Informed points: ${record.points} (Expected: -1)`);
  if (record.points !== -1) throw new Error('Absent Not Informed points calculation failed');

  // Absent Informed (0)
  record.status = 'absent_informed';
  await record.save();
  console.log(` -> Absent Informed points: ${record.points} (Expected: 0)`);
  if (record.points !== 0) throw new Error('Absent Informed points calculation failed');

  // 3. Test Session Locking Enforcement
  console.log('Locking the test session...');
  testSession.locked = true;
  await testSession.save();

  // Test save() rejection
  console.log('Testing write blocks via pre-save hook...');
  try {
    record.status = 'present';
    await record.save();
    console.error('ERROR: Database allowed record.save() on a locked session!');
    process.exit(1);
  } catch (err) {
    console.log(' -> OK: record.save() was rejected correctly:', err.message);
  }

  // Test findOneAndUpdate rejection
  console.log('Testing write blocks via pre-findOneAndUpdate hook...');
  try {
    await AttendanceRecord.findOneAndUpdate(
      { _id: record._id },
      { status: 'present' }
    );
    console.error('ERROR: Database allowed findOneAndUpdate on a locked session!');
    process.exit(1);
  } catch (err) {
    console.log(' -> OK: findOneAndUpdate was rejected correctly:', err.message);
  }

  // Cleanup
  console.log('Cleaning up validation test records...');
  await AttendanceRecord.deleteOne({ _id: record._id });
  await ScrumSession.deleteOne({ _id: testSession._id });

  console.log('\n🌟 SUCCESS: All database security locks and points engine rules validated perfectly!');
  await mongoose.disconnect();
}

runValidation().catch((err) => {
  console.error('Validation test failed:', err);
  process.exit(1);
});
