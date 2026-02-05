import { NextRequest, NextResponse } from 'next/server';
import { startGame } from '@/lib/game-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { hostId, hostToken } = body as { hostId: string; hostToken: string };

    if (!hostId || !hostToken) {
      return NextResponse.json(
        { success: false, error: 'Missing host credentials' },
        { status: 400 }
      );
    }

    const result = await startGame(code, hostId, hostToken);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start game' },
      { status: 500 }
    );
  }
}
