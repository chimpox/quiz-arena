import { Game, Player, Question, GameSettings } from './types';
import { generateGameCode } from './game-utils';

// Mock in-memory store for games (replace with real backend/WebSocket later)
const games = new Map<string, Game>();

export const mockGameStore = {
  createGame(hostId: string, settings: GameSettings, questions: Question[]): Game {
    const code = generateGameCode();
    const game: Game = {
      code,
      hostId,
      settings,
      questions,
      players: [],
      currentQuestionIndex: 0,
      status: 'lobby',
    };
    games.set(code, game);
    return game;
  },

  getGame(code: string): Game | undefined {
    return games.get(code);
  },

  joinGame(code: string, player: Player): boolean {
    const game = games.get(code);
    if (!game || game.status !== 'lobby') return false;
    
    game.players.push(player);
    return true;
  },

  updatePlayer(code: string, playerId: string, updates: Partial<Player>): boolean {
    const game = games.get(code);
    if (!game) return false;
    
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;
    
    game.players[playerIndex] = { ...game.players[playerIndex], ...updates };
    return true;
  },

  startGame(code: string): boolean {
    const game = games.get(code);
    if (!game || game.status !== 'lobby') return false;
    
    game.status = 'playing';
    game.startedAt = new Date();
    return true;
  },

  nextQuestion(code: string): boolean {
    const game = games.get(code);
    if (!game) return false;
    
    if (game.currentQuestionIndex < game.questions.length - 1) {
      game.currentQuestionIndex++;
      game.status = 'playing';
      return true;
    }
    
    game.status = 'final-results';
    return false;
  },

  updateGameStatus(code: string, status: Game['status']): boolean {
    const game = games.get(code);
    if (!game) return false;
    
    game.status = status;
    return true;
  },
};

// Sample questions for testing
export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: '1',
    text: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctIndex: 2,
    timeLimit: 10,
  },
  {
    id: '2',
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
    timeLimit: 10,
  },
  {
    id: '3',
    text: 'What is 7 x 8?',
    options: ['54', '56', '58', '60'],
    correctIndex: 1,
    timeLimit: 10,
  },
  {
    id: '4',
    text: 'Who painted the Mona Lisa?',
    options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'],
    correctIndex: 1,
    timeLimit: 10,
  },
  {
    id: '5',
    text: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correctIndex: 3,
    timeLimit: 10,
  },
];
