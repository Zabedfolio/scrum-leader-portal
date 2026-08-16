import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import Admin from '@/models/Admin';
import { requireAuth } from '@/lib/auth';

// GET /api/auth/admins - List all administrators
export async function GET() {
  try {
    await requireAuth();
    await connectDB();

    const admins = await Admin.find({}).select('name email role createdAt lastActiveAt').sort({ createdAt: -1 });
    return NextResponse.json(admins);
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Fetch admins error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/auth/admins - Create a new administrator/moderator
export async function POST(request) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { name, email, password, role } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Check if role is valid
    if (!['scrum_leader', 'co_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // Check if email already in use
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) {
      return NextResponse.json({ error: 'Email address is already in use by another administrator' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin
    const newAdmin = await Admin.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
    });

    return NextResponse.json({
      message: 'Administrator created successfully',
      admin: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt,
      }
    }, { status: 201 });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
