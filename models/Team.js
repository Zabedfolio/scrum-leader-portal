import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema(
  {
    teamCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    teamName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
