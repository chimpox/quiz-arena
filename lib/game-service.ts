import { randomUUID } from 'crypto';
import { getRedis, gameKey, GAME_TTL } from './redis';
import { getPusher, gameChannel, PUSHER_EVENTS } from './pusher-server';
import type { GameSettings, Question, Player, AvatarStyle } from './types';

// Generate a random 6-digit game code
function generateGameCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate unique ID with prefix
function randomId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

// Game state stored in Redis
export interface GameState {
  code: string;
  hostId: string;
  hostToken: string;
  status: 'lobby' | 'playing' | 'question-results' | 'final-results';
  settings: GameSettings;
  questions: Question[];
  currentQuestionIndex: number;
  players: Record<string, PlayerState>;
  answersThisRound: Record<string, AnswerRecord>;
  createdAt: number;
}

export interface PlayerState {
  id: string;
  token: string;
  name: string;
  avatarStyle: AvatarStyle;
  avatarSeed: string;
  avatarColor?: string;
  health: number;
  maxHealth: number;
  points: number;
  isReady: boolean;
  isEliminated: boolean;
}

export interface AnswerRecord {
  playerId: string;
  answerIndex: number;
  timeRemaining: number;
  timestamp: number;
}

// Response types
export interface CreateGameResponse {
  success: true;
  code: string;
  hostId: string;
  hostToken: string;
}

export interface JoinGameResponse {
  success: true;
  code: string;
  playerId: string;
  playerToken: string;
}

export interface GameStateResponse {
  code: string;
  status: GameState['status'];
  settings: GameSettings;
  questionsCount: number;
  currentQuestionIndex: number;
  players: Player[];
  currentQuestion?: Question;
  questions?: Question[];
}

// ==================== GAME SERVICE FUNCTIONS ====================

export async function createGame(
  settings: GameSettings,
  questions: Question[]
): Promise<CreateGameResponse> {
  const redis = getRedis();

  // Generate unique code
  let code = generateGameCode();
  let attempts = 0;
  while (await redis.exists(gameKey(code)) && attempts < 10) {
    code = generateGameCode();
    attempts++;
  }

  const hostId = randomId('host');
  const hostToken = randomUUID();

  const gameState: GameState = {
    code,
    hostId,
    hostToken,
    status: 'lobby',
    settings,
    questions,
    currentQuestionIndex: 0,
    players: {},
    answersThisRound: {},
    createdAt: Date.now(),
  };

  await redis.set(gameKey(code), JSON.stringify(gameState), { ex: GAME_TTL });

  return { success: true, code, hostId, hostToken };
}

export async function getGame(code: string): Promise<GameState | null> {
  const redis = getRedis();
  const data = await redis.get<string>(gameKey(code));
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function saveGame(game: GameState): Promise<void> {
  const redis = getRedis();
  await redis.set(gameKey(game.code), JSON.stringify(game), { ex: GAME_TTL });
}

export async function joinGame(
  code: string,
  name: string,
  avatarStyle: AvatarStyle,
  avatarSeed: string,
  avatarColor?: string
): Promise<JoinGameResponse | { success: false; error: string }> {
  const game = await getGame(code);

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.status !== 'lobby') {
    return { success: false, error: 'Game has already started' };
  }

  const playerId = randomId('player');
  const playerToken = randomUUID();

  const player: PlayerState = {
    id: playerId,
    token: playerToken,
    name: name.trim(),
    avatarStyle,
    avatarSeed,
    avatarColor,
    health: game.settings.startingHealth,
    maxHealth: game.settings.maxHealth,
    points: 0,
    isReady: true,
    isEliminated: false,
  };

  game.players[playerId] = player;
  await saveGame(game);

  // Broadcast player joined via Pusher
  const pusher = getPusher();
  await pusher.trigger(gameChannel(code), PUSHER_EVENTS.PLAYER_JOINED, {
    player: playerToPublic(player),
  });

  // Also send lobby update
  await pusher.trigger(gameChannel(code), PUSHER_EVENTS.LOBBY_UPDATE, {
    players: Object.values(game.players).map(playerToPublic),
    questionsCount: game.questions.length,
  });

  return { success: true, code, playerId, playerToken };
}

export async function startGame(
  code: string,
  hostId: string,
  hostToken: string
): Promise<{ success: true; game: GameStateResponse } | { success: false; error: string }> {
  const game = await getGame(code);

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.hostId !== hostId || game.hostToken !== hostToken) {
    return { success: false, error: 'Not authorized' };
  }

  if (game.status !== 'lobby') {
    return { success: false, error: 'Game already started' };
  }

  if (Object.keys(game.players).length === 0) {
    return { success: false, error: 'No players in game' };
  }

  game.status = 'playing';
  game.currentQuestionIndex = 0;
  game.answersThisRound = {};
  await saveGame(game);

  // Broadcast game started via Pusher
  const pusher = getPusher();
  await pusher.trigger(gameChannel(code), PUSHER_EVENTS.GAME_STARTED, {
    questions: game.questions,
    currentQuestionIndex: 0,
    players: Object.values(game.players).map(playerToPublic),
  });

  return {
    success: true,
    game: gameStateToResponse(game, true),
  };
}

export async function submitAnswer(
  code: string,
  playerId: string,
  playerToken: string,
  answerIndex: number,
  timeRemaining: number
): Promise<{ success: true; isCorrect: boolean; pointsEarned: number; healthChange: number } | { success: false; error: string }> {
  const game = await getGame(code);

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const player = game.players[playerId];
  if (!player || player.token !== playerToken) {
    return { success: false, error: 'Not authorized' };
  }

  if (game.status !== 'playing') {
    return { success: false, error: 'Game not in playing state' };
  }

  if (game.answersThisRound[playerId]) {
    return { success: false, error: 'Already answered' };
  }

  const currentQuestion = game.questions[game.currentQuestionIndex];
  const isCorrect = answerIndex === currentQuestion.correctIndex;

  // Calculate points
  const pointsEarned = isCorrect
    ? 500 + Math.floor((timeRemaining / currentQuestion.timeLimit) * 500)
    : 0;

  // Calculate health change
  const healthChange = isCorrect
    ? game.settings.healthGainCorrect
    : -game.settings.healthLossWrong;

  // Update player state
  player.points += pointsEarned;
  player.health = Math.max(0, Math.min(player.maxHealth, player.health + healthChange));
  player.isEliminated = player.health <= 0;

  // Record answer
  game.answersThisRound[playerId] = {
    playerId,
    answerIndex,
    timeRemaining,
    timestamp: Date.now(),
  };

  await saveGame(game);

  // Broadcast answer submitted (for host to see progress)
  const pusher = getPusher();
  await pusher.trigger(gameChannel(code), PUSHER_EVENTS.ANSWER_SUBMITTED, {
    playerId,
    answeredCount: Object.keys(game.answersThisRound).length,
    totalPlayers: Object.keys(game.players).length,
  });

  return { success: true, isCorrect, pointsEarned, healthChange };
}

export async function advanceToResults(
  code: string,
  hostId: string,
  hostToken: string
): Promise<{ success: true } | { success: false; error: string }> {
  const game = await getGame(code);

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.hostId !== hostId || game.hostToken !== hostToken) {
    return { success: false, error: 'Not authorized' };
  }

  game.status = 'question-results';
  await saveGame(game);

  const currentQuestion = game.questions[game.currentQuestionIndex];

  // Broadcast question results
  const pusher = getPusher();
  await pusher.trigger(gameChannel(code), PUSHER_EVENTS.QUESTION_RESULTS, {
    correctIndex: currentQuestion.correctIndex,
    players: Object.values(game.players).map(playerToPublic),
    answers: game.answersThisRound,
  });

  return { success: true };
}

export async function nextQuestion(
  code: string,
  hostId: string,
  hostToken: string
): Promise<{ success: true; hasMore: boolean; questionIndex?: number } | { success: false; error: string }> {
  const game = await getGame(code);

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.hostId !== hostId || game.hostToken !== hostToken) {
    return { success: false, error: 'Not authorized' };
  }

  const pusher = getPusher();

  if (game.currentQuestionIndex < game.questions.length - 1) {
    game.currentQuestionIndex++;
    game.status = 'playing';
    game.answersThisRound = {};
    await saveGame(game);

    await pusher.trigger(gameChannel(code), PUSHER_EVENTS.NEXT_QUESTION, {
      questionIndex: game.currentQuestionIndex,
      question: game.questions[game.currentQuestionIndex],
      players: Object.values(game.players).map(playerToPublic),
    });

    return { success: true, hasMore: true, questionIndex: game.currentQuestionIndex };
  } else {
    game.status = 'final-results';
    await saveGame(game);

    // Sort players by points for final standings
    const finalStandings = Object.values(game.players)
      .map(playerToPublic)
      .sort((a, b) => b.points - a.points);

    await pusher.trigger(gameChannel(code), PUSHER_EVENTS.GAME_ENDED, {
      finalStandings,
    });

    return { success: true, hasMore: false };
  }
}

export async function removePlayer(
  code: string,
  playerId: string
): Promise<void> {
  const game = await getGame(code);
  if (!game) return;

  if (game.players[playerId]) {
    const playerName = game.players[playerId].name;
    delete game.players[playerId];
    await saveGame(game);

    const pusher = getPusher();
    await pusher.trigger(gameChannel(code), PUSHER_EVENTS.PLAYER_LEFT, {
      playerId,
      playerName,
    });

    await pusher.trigger(gameChannel(code), PUSHER_EVENTS.LOBBY_UPDATE, {
      players: Object.values(game.players).map(playerToPublic),
      questionsCount: game.questions.length,
    });
  }
}

// Helper: Convert PlayerState to public Player (without token)
function playerToPublic(player: PlayerState): Player {
  return {
    id: player.id,
    name: player.name,
    avatarStyle: player.avatarStyle,
    avatarSeed: player.avatarSeed,
    avatarColor: player.avatarColor,
    health: player.health,
    maxHealth: player.maxHealth,
    points: player.points,
    isReady: player.isReady,
    isEliminated: player.isEliminated,
  };
}

// Helper: Convert GameState to response (without sensitive data)
export function gameStateToResponse(game: GameState, includingQuestions: boolean = false): GameStateResponse {
  const response: GameStateResponse = {
    code: game.code,
    status: game.status,
    settings: game.settings,
    questionsCount: game.questions.length,
    currentQuestionIndex: game.currentQuestionIndex,
    players: Object.values(game.players).map(playerToPublic),
  };

  if (includingQuestions && (game.status === 'playing' || game.status === 'question-results')) {
    response.questions = game.questions;
    response.currentQuestion = game.questions[game.currentQuestionIndex];
  }

  return response;
}

// Validate host credentials
export async function validateHost(
  code: string,
  hostId: string,
  hostToken: string
): Promise<boolean> {
  const game = await getGame(code);
  if (!game) return false;
  return game.hostId === hostId && game.hostToken === hostToken;
}

// Validate player credentials
export async function validatePlayer(
  code: string,
  playerId: string,
  playerToken: string
): Promise<boolean> {
  const game = await getGame(code);
  if (!game) return false;
  const player = game.players[playerId];
  return player !== undefined && player.token === playerToken;
}
