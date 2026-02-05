'use client';

import PusherClient from 'pusher-js';

// Store for current user info
let currentUserInfo: { userId?: string; userName?: string; userRole?: string } = {};

// Singleton instance
let pusherInstance: PusherClient | null = null;

export function setUserInfo(userId?: string, userName?: string, userRole?: string) {
  currentUserInfo = { userId, userName, userRole };
}

export function getPusherClient(): PusherClient {
  if (!pusherInstance) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      throw new Error('Pusher client configuration missing. Check NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER environment variables.');
    }

    pusherInstance = new PusherClient(key, {
      cluster,
      channelAuthorization: {
        endpoint: '/api/pusher/auth',
        transport: 'ajax',
        params: {},
        paramsProvider: () => ({
          user_id: currentUserInfo.userId || `anon-${Date.now()}`,
          user_name: currentUserInfo.userName || 'Anonymous',
          user_role: currentUserInfo.userRole || 'spectator',
        }),
      },
    });
  }

  return pusherInstance;
}

// Channel name helper (same as server)
export function gameChannel(code: string): string {
  return `presence-game-${code}`;
}

// Event types (same as server for consistency)
export const PUSHER_EVENTS = {
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  GAME_STARTED: 'game-started',
  ANSWER_SUBMITTED: 'answer-submitted',
  QUESTION_RESULTS: 'question-results',
  NEXT_QUESTION: 'next-question',
  GAME_ENDED: 'game-ended',
  LOBBY_UPDATE: 'lobby-update',
} as const;
