import mongoose from 'mongoose';

const ScrumSessionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    sessionType: {
      type: String,
      enum: ['Day', 'Afternoon'],
      required: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    checkInToken: {
      type: String,
      default: null,
      index: true,
    },
    checkInTokenExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on date, sessionType, and teamId
ScrumSessionSchema.index({ date: 1, sessionType: 1, teamId: 1 }, { unique: true });

export default mongoose.models.ScrumSession || mongoose.model('ScrumSession', ScrumSessionSchema);
