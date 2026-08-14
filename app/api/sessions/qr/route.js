import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    // Restrict QR generation to authenticated admins
    await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');

    if (!text) {
      return NextResponse.json({ error: 'text query parameter is required' }, { status: 400 });
    }

    // Generate PNG buffer
    const pngBuffer = await QRCode.toBuffer(text, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#064e3b', // emerald-950
        light: '#f0fdf4', // emerald-50
      },
    });

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
