import { NextRequest, NextResponse } from 'next/server';
import { submitAnswer } from '@/lib/game-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { playerId, playerToken, answerIndex, timeRemaining } = body as {
      playerId: string;
      playerToken: string;
      answerIndex: number;
      timeRemaining: number;
    };

    if (!playerId || !playerToken) {
      return NextResponse.json(
        { success: false, error: 'Missing player credentials' },
        { status: 400 }
      );
    }

    if (answerIndex === undefined || answerIndex < -1) {
      return NextResponse.json(
        { success: false, error: 'Invalid answer index' },
        { status: 400 }
      );
    }

    const result = await submitAnswer(code, playerId, playerToken, answerIndex, timeRemaining || 0);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Submit answer error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
