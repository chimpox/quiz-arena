import { NextRequest, NextResponse } from 'next/server';
import { createGame } from '@/lib/game-service';
import type { GameSettings, Question } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings, questions } = body as { settings: GameSettings; questions: Question[] };

    // Validate input
    if (!settings || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid settings/questions' },
        { status: 400 }
      );
    }

    // Validate settings
    if (settings.startingHealth < 5 || settings.startingHealth > 20) {
      return NextResponse.json(
        { success: false, error: 'Starting health must be between 5 and 20' },
        { status: 400 }
      );
    }

    if (settings.maxHealth < 10 || settings.maxHealth > 25) {
      return NextResponse.json(
        { success: false, error: 'Max health must be between 10 and 25' },
        { status: 400 }
      );
    }

    if (settings.maxHealth < settings.startingHealth) {
      return NextResponse.json(
        { success: false, error: 'Max health must be >= starting health' },
        { status: 400 }
      );
    }

    // Validate questions
    for (const q of questions) {
      if (!q.text || !q.options || q.options.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Each question must have text and at least 2 options' },
          { status: 400 }
        );
      }
    }

    const result = await createGame(settings, questions);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
