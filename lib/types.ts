export type AvatarStyle = 
  | 'adventurer'
  | 'avataaars'
  | 'bottts'
  | 'fun-emoji'
  | 'identicon'
  | 'lorelei'
  | 'micah'
  | 'miniavs'
  | 'notionists'
  | 'open-peeps'
  | 'personas'
  | 'pixel-art';

export interface Player {
  id: string;
  name: string;
  avatarStyle: AvatarStyle;
  avatarSeed: string;
  avatarColor?: string;
  health: number;
  maxHealth: number;
  points: number;
  isReady: boolean;
  isEliminated: boolean;
  currentAnswer?: number;
  rankChange?: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timeLimit: number;
}

export interface GameSettings {
  startingHealth: number;
  maxHealth: number;
  healthGainCorrect: number;
  healthLossWrong: number;
  questionTimeLimit: number;
}

export interface Game {
  code: string;
  hostId: string;
  settings: GameSettings;
  questions: Question[];
  players: Player[];
  currentQuestionIndex: number;
  status: 'lobby' | 'playing' | 'question-results' | 'final-results';
  startedAt?: Date;
}

export interface QuestionResult {
  questionId: string;
  playerId: string;
  selectedIndex: number;
  isCorrect: boolean;
  timeToAnswer: number;
  healthChange: number;
  pointsEarned: number;
}

// API Response Types
export interface CreateGameAPIResponse {
  success: true;
  code: string;
  hostId: string;
  hostToken: string;
}

export interface JoinGameAPIResponse {
  success: true;
  code: string;
  playerId: string;
  playerToken: string;
}

export interface GameAPIResponse {
  code: string;
  status: Game['status'];
  settings: GameSettings;
  questionsCount: number;
  currentQuestionIndex: number;
  players: Player[];
  currentQuestion?: Question;
  questions?: Question[];
}

export interface AnswerAPIResponse {
  success: true;
  isCorrect: boolean;
  pointsEarned: number;
  healthChange: number;
}

export interface APIErrorResponse {
  success: false;
  error: string;
}

// Session storage types
export interface HostSessionInfo {
  hostId: string;
  hostToken: string;
  gameCode: string;
}

export interface PlayerSessionInfo {
  playerId: string;
  playerToken: string;
  name: string;
  avatarStyle: AvatarStyle;
  avatarSeed: string;
  avatarColor?: string;
  gameCode: string;
}
