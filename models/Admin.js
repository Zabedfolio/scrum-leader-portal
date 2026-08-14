import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['scrum_leader', 'co_admin'],
      default: 'scrum_leader',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
