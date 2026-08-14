import mongoose from 'mongoose';

const AttendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScrumSession',
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent_not_informed', 'absent_informed', 'unresolved'],
      default: 'unresolved',
    },
    points: {
      type: Number,
      required: true,
      default: 0,
    },
    informedReason: {
      type: String,
      enum: ['Exam', 'Sickness', 'Family Emergency', 'Other'],
      default: null,
    },
    informedNote: {
      type: String,
      default: null,
    },
    informedDocumentUrl: {
      type: String,
      default: null,
    },
    markedBy: {
      type: String,
      enum: ['self_checkin', 'admin_manual'],
      default: null,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on sessionId + memberId
AttendanceRecordSchema.index({ sessionId: 1, memberId: 1 }, { unique: true });

// Auto-calculate points before validating/saving
AttendanceRecordSchema.pre('validate', function () {
  if (this.status === 'present') {
    this.points = 1;
  } else if (this.status === 'absent_not_informed') {
    this.points = -1;
  } else if (this.status === 'absent_informed') {
    this.points = 0;
  } else {
    this.points = 0; // unresolved/neutral state has 0 points
  }
});

// Helper function to check if parent ScrumSession is locked
async function checkSessionLock(sessionId) {
  const ScrumSession = mongoose.models.ScrumSession || mongoose.model('ScrumSession');
  const session = await ScrumSession.findById(sessionId);
  if (session && session.locked) {
    throw new Error('This session is locked and cannot be modified.');
  }
}

// Pre-save hook
AttendanceRecordSchema.pre('save', async function () {
  await checkSessionLock(this.sessionId);
});

// Pre-findOneAndUpdate hook
AttendanceRecordSchema.pre('findOneAndUpdate', async function () {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate) {
    await checkSessionLock(docToUpdate.sessionId);
  }
});

// Pre-updateOne hook
AttendanceRecordSchema.pre('updateOne', async function () {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate) {
    await checkSessionLock(docToUpdate.sessionId);
  }
});

// Pre-updateMany hook
AttendanceRecordSchema.pre('updateMany', async function () {
  const query = this.getQuery();
  const records = await this.model.find(query);
  for (const record of records) {
    await checkSessionLock(record.sessionId);
  }
});

export default mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', AttendanceRecordSchema);
