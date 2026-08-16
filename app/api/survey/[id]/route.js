import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SurveyResponse from '@/models/SurveyResponse';
import { requireAuth } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    await requireAuth();
    await connectDB();

    const { id } = await params;

    const deleted = await SurveyResponse.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Survey response not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Survey response deleted successfully' });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete survey response error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
