import { NextRequest, NextResponse } from 'next/server';
import { getPusher } from '@/lib/pusher-server';
import { getGame } from '@/lib/game-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const socketId = formData.get('socket_id') as string;
    const channelName = formData.get('channel_name') as string;

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      );
    }

    // Extract game code from channel name (presence-game-XXXXXX)
    const match = channelName.match(/^presence-game-(\d{6})$/);
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid channel name' },
        { status: 400 }
      );
    }

    const gameCode = match[1];

    // Verify game exists
    const game = await getGame(gameCode);
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Get user info from request headers or body
    const userId = formData.get('user_id') as string || `user-${Date.now()}`;
    const userName = formData.get('user_name') as string || 'Anonymous';
    const userRole = formData.get('user_role') as string || 'spectator';

    const presenceData = {
      user_id: userId,
      user_info: {
        name: userName,
        role: userRole,
      },
    };

    const pusher = getPusher();
    const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
