import { NextRequest, NextResponse } from 'next/server';
import { joinGame } from '@/lib/game-service';
import type { AvatarStyle } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, avatarStyle, avatarSeed, avatarColor } = body as {
      code: string;
      name: string;
      avatarStyle: AvatarStyle;
      avatarSeed: string;
      avatarColor?: string;
    };

    // Validate input
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Invalid game code' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length > 20) {
      return NextResponse.json(
        { success: false, error: 'Name must be 20 characters or less' },
        { status: 400 }
      );
    }

    const result = await joinGame(code, name, avatarStyle, avatarSeed, avatarColor);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join game' },
      { status: 500 }
    );
  }
}
