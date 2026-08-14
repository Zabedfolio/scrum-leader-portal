import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Admin from '@/models/Admin';

export async function GET() {
  try {
    await connectDB();
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const admin = await Admin.findById(user.id).select('-passwordHash');
    if (!admin) {
      const response = NextResponse.json(
        { authenticated: false, error: 'User not found' },
        { status: 401 }
      );
      response.cookies.set('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        expires: new Date(0),
      });
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      user: admin,
    });
  } catch (error) {
    console.error('Auth-me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
