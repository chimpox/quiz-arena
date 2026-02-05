import Pusher from 'pusher';

// Create Pusher server instance - will be undefined if env vars are not set
const pusher = process.env.PUSHER_APP_ID &&
  process.env.NEXT_PUBLIC_PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    })
  : null;

export function getPusher(): Pusher {
  if (!pusher) {
    throw new Error('Pusher server not initialized. Check PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, and NEXT_PUBLIC_PUSHER_CLUSTER environment variables.');
  }
  return pusher;
}

// Channel name helper
export function gameChannel(code: string): string {
  return `presence-game-${code}`;
}

// Event types
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
