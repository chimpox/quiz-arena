import { NextRequest, NextResponse } from 'next/server';
import { nextQuestion, advanceToResults } from '@/lib/game-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { hostId, hostToken, action } = body as {
      hostId: string;
      hostToken: string;
      action?: 'results' | 'next';
    };

    if (!hostId || !hostToken) {
      return NextResponse.json(
        { success: false, error: 'Missing host credentials' },
        { status: 400 }
      );
    }

    // If action is 'results', show question results first
    if (action === 'results') {
      const result = await advanceToResults(code, hostId, hostToken);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    // Otherwise advance to next question
    const result = await nextQuestion(code, hostId, hostToken);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Next question error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to advance game' },
      { status: 500 }
    );
  }
}
