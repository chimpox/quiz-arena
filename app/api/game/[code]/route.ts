import { NextRequest, NextResponse } from 'next/server';
import { getGame, gameStateToResponse } from '@/lib/game-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const game = await getGame(code);

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check for auth headers to determine if we should include questions
    const hostToken = request.headers.get('x-host-token');
    const playerToken = request.headers.get('x-player-token');
    const isAuthenticated = !!hostToken || !!playerToken;

    // Include questions if game is in playing/question-results state and user is authenticated
    const includeQuestions = isAuthenticated &&
      (game.status === 'playing' || game.status === 'question-results');

    return NextResponse.json({
      success: true,
      game: gameStateToResponse(game, includeQuestions),
    });
  } catch (error) {
    console.error('Get game error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get game' },
      { status: 500 }
    );
  }
}
