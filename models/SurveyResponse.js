import mongoose from 'mongoose';

const SurveyResponseSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    role: {
      type: String,
      enum: ['Team Lead', 'Member'],
      required: true,
    },
    standup11AmSuitable: {
      type: String,
      enum: ['Yes, always available', 'Sometimes available', 'No, mostly unavailable'],
      required: true,
    },
    standup11AmNotSuitableReason: {
      type: [String],
      default: [],
    },
    standup11AmNotSuitableReasonOther: {
      type: String,
      trim: true,
      default: '',
    },
    standup830PmSuitable: {
      type: String,
      enum: ['Yes, always available', 'Sometimes available', 'No, mostly unavailable'],
      required: true,
    },
    standup830PmNotSuitableReason: {
      type: [String],
      default: [],
    },
    standup830PmNotSuitableReasonOther: {
      type: String,
      trim: true,
      default: '',
    },
    classes1030To1200: {
      type: String,
      enum: ['Yes, every day', 'Yes, some days', 'No'],
      required: true,
    },
    classes1030To1200Days: {
      type: [String],
      default: [],
    },
    commitment800To930: {
      type: String,
      enum: ['Yes, every day', 'Yes, some days', 'No'],
      required: true,
    },
    commitment800To930Details: {
      type: String,
      trim: true,
      default: '',
    },
    preferredTime: {
      type: String,
      trim: true,
      default: '',
    },
    preferredDays: {
      type: String,
      enum: ['Weekdays only', 'Weekdays + Saturday', 'Flexible'],
      required: true,
    },
    concernsOrSuggestions: {
      type: String,
      trim: true,
      default: '',
    },
    otherRemarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SurveyResponse || mongoose.model('SurveyResponse', SurveyResponseSchema);
