import { Redis } from '@upstash/redis';

// Create Redis client - will be undefined if env vars are not set
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Game TTL: 2 hours
const GAME_TTL = 60 * 60 * 2;

export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis client not initialized. Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.');
  }
  return redis;
}

export function gameKey(code: string): string {
  return `game:${code}`;
}

export { GAME_TTL };
