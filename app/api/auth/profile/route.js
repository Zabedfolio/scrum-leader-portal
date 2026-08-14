import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import Admin from '@/models/Admin';
import { requireAuth } from '@/lib/auth';

export async function PATCH(request) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { name, email, currentPassword, newPassword } = await request.json();

    const admin = await Admin.findById(user.id);
    if (!admin) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    // 1. Update basic profile info
    if (name) admin.name = name.trim();
    if (email && email.toLowerCase() !== admin.email) {
      const existing = await Admin.findOne({ email: email.toLowerCase() });
      if (existing) {
        return NextResponse.json(
          { error: 'Email address is already in use by another admin' },
          { status: 409 }
        );
      }
      admin.email = email.toLowerCase().trim();
    }

    // 2. Update password if requested
    if (currentPassword && newPassword) {
      const isPasswordValid = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Current password provided is incorrect' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      admin.passwordHash = await bcrypt.hash(newPassword, 10);
    } else if (currentPassword || newPassword) {
      return NextResponse.json(
        { error: 'Both current password and new password are required to change passwords' },
        { status: 400 }
      );
    }

    await admin.save();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
