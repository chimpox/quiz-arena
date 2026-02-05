'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Timer, ChevronDown, ChevronUp } from 'lucide-react';
import { getAvatarUrl, calculatePoints, getHealthBarColor } from '@/lib/game-utils';
import { usePusher } from '@/hooks/use-pusher';
import type { Player, Question, GameSettings, HostSessionInfo, PlayerSessionInfo } from '@/lib/types';

interface GameState {
  code: string;
  status: string;
  settings: GameSettings;
  questions: Question[];
  players: Player[];
  currentQuestionIndex: number;
}

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [game, setGame] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load user info from sessionStorage
  useEffect(() => {
    const hostInfo = sessionStorage.getItem('hostInfo');
    const playerInfo = sessionStorage.getItem('playerInfo');

    if (hostInfo) {
      const parsed = JSON.parse(hostInfo) as HostSessionInfo;
      if (parsed.gameCode === resolvedParams.code) {
        setIsHost(true);
        setHostId(parsed.hostId);
        setHostToken(parsed.hostToken);
      }
    }

    if (playerInfo) {
      const parsed = JSON.parse(playerInfo) as PlayerSessionInfo;
      if (parsed.gameCode === resolvedParams.code) {
        setPlayerId(parsed.playerId);
        setPlayerToken(parsed.playerToken);
      }
    }
  }, [resolvedParams.code]);

  // Fetch initial game state
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/game/${resolvedParams.code}`, {
          headers: {
            ...(hostToken && { 'x-host-token': hostToken }),
            ...(playerToken && { 'x-player-token': playerToken }),
          },
        });

        if (!response.ok) {
          router.push('/');
          return;
        }

        const data = await response.json();
        if (data.success && data.game) {
          // If game is still in lobby, redirect back
          if (data.game.status === 'lobby') {
            router.push(`/lobby/${resolvedParams.code}`);
            return;
          }

          // If game ended, go to final results
          if (data.game.status === 'final-results') {
            router.push(`/game/${resolvedParams.code}/final`);
            return;
          }

          setGame({
            code: data.game.code,
            status: data.game.status,
            settings: data.game.settings,
            questions: data.game.questions || [],
            players: data.game.players,
            currentQuestionIndex: data.game.currentQuestionIndex,
          });

          // Find current player
          if (playerId && data.game.players) {
            const player = data.game.players.find((p: Player) => p.id === playerId);
            if (player) setCurrentPlayer(player);
          } else if (data.game.players.length > 0) {
            setCurrentPlayer(data.game.players[0]);
          }

          // Set timer
          if (data.game.questions && data.game.questions.length > 0) {
            const currentQ = data.game.questions[data.game.currentQuestionIndex];
            if (currentQ) {
              setTimeRemaining(currentQ.timeLimit);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch game:', err);
        router.push('/');
      }
    };

    fetchGame();
  }, [resolvedParams.code, router, hostToken, playerToken, playerId]);

  // Pusher event handlers
  const handleGameStarted = useCallback((data: { questions: Question[]; currentQuestionIndex: number; players: Player[] }) => {
    setGame((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        questions: data.questions,
        currentQuestionIndex: data.currentQuestionIndex,
        players: data.players,
        status: 'playing',
      };
    });

    // Find current player
    if (playerId && data.players) {
      const player = data.players.find((p) => p.id === playerId);
      if (player) setCurrentPlayer(player);
    } else if (data.players.length > 0) {
      setCurrentPlayer(data.players[0]);
    }

    // Reset state for new game
    setHasAnswered(false);
    setSelectedAnswer(null);
    if (data.questions.length > 0) {
      setTimeRemaining(data.questions[0].timeLimit);
    }
  }, [playerId]);

  const handleNextQuestion = useCallback((data: { questionIndex: number; question: Question; players: Player[] }) => {
    setGame((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentQuestionIndex: data.questionIndex,
        players: data.players,
        status: 'playing',
      };
    });

    // Update current player
    if (playerId && data.players) {
      const player = data.players.find((p) => p.id === playerId);
      if (player) setCurrentPlayer(player);
    }

    // Reset for new question
    setHasAnswered(false);
    setSelectedAnswer(null);
    setTimeRemaining(data.question.timeLimit);
  }, [playerId]);

  const handleQuestionResults = useCallback((data: { correctIndex: number; players: Player[] }) => {
    setGame((prev) => {
      if (!prev) return null;
      return { ...prev, players: data.players, status: 'question-results' };
    });

    // Update current player
    if (playerId && data.players) {
      const player = data.players.find((p) => p.id === playerId);
      if (player) setCurrentPlayer(player);
    }
  }, [playerId]);

  const handleGameEnded = useCallback(() => {
    router.push(`/game/${resolvedParams.code}/final`);
  }, [router, resolvedParams.code]);

  // Set up Pusher connection
  const { isConnected } = usePusher({
    gameCode: resolvedParams.code,
    userId: isHost ? hostId || undefined : playerId || undefined,
    userName: isHost ? 'Host' : currentPlayer?.name,
    userRole: isHost ? 'host' : 'player',
    onGameStarted: handleGameStarted,
    onNextQuestion: handleNextQuestion,
    onQuestionResults: handleQuestionResults,
    onGameEnded: handleGameEnded,
  });

  // Timer countdown
  useEffect(() => {
    if (!game || hasAnswered || game.status !== 'playing') return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [game, hasAnswered]);

  // Handle time's up - separate effect to avoid setState during render
  useEffect(() => {
    if (timeRemaining === 0 && !hasAnswered && game?.status === 'playing') {
      if (isHost) {
        // Host: navigate to results page to see standings and advance game
        router.push(`/game/${resolvedParams.code}/results?answer=-1&correct=false&points=0&healthChange=0`);
      } else {
        // Player: auto submit with no answer
        handleAnswerSubmit(-1);
      }
    }
  }, [timeRemaining, hasAnswered, isHost, game?.status, router, resolvedParams.code]);

  const handleAnswerSelect = (index: number) => {
    if (hasAnswered || isSubmitting) return;
    setSelectedAnswer(index);
  };

  const handleAnswerSubmit = async (answerIndex: number) => {
    if (hasAnswered || !game || !playerId || !playerToken || isSubmitting) return;

    setIsSubmitting(true);
    setHasAnswered(true);

    const currentQuestion = game.questions[game.currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const points = calculatePoints(isCorrect, timeRemaining, currentQuestion.timeLimit);
    const healthChange = isCorrect
      ? game.settings.healthGainCorrect
      : -game.settings.healthLossWrong;

    try {
      // Submit answer to server
      await fetch(`/api/game/${resolvedParams.code}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          playerToken,
          answerIndex,
          timeRemaining,
        }),
      });

      // Navigate to results page
      setTimeout(() => {
        router.push(`/game/${resolvedParams.code}/results?answer=${answerIndex}&correct=${isCorrect}&points=${points}&healthChange=${healthChange}`);
      }, 500);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      // Still navigate to results even if API fails
      setTimeout(() => {
        router.push(`/game/${resolvedParams.code}/results?answer=${answerIndex}&correct=${isCorrect}&points=${points}&healthChange=${healthChange}`);
      }, 500);
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="flex items-center gap-2 text-slate-600">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
          <span>{isConnected ? 'Loading game...' : 'Connecting...'}</span>
        </div>
      </div>
    );
  }

  if (!game.questions || game.questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <p className="text-slate-600">Waiting for questions...</p>
      </div>
    );
  }

  const currentQuestion = game.questions[game.currentQuestionIndex];
  const healthPercentage = currentPlayer ? (currentPlayer.health / currentPlayer.maxHealth) * 100 : 100;
  const topPlayers = [...(game.players || [])]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Top Stats Bar */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 md:p-6 border-b bg-white shadow-sm">
        <div className="flex-1 w-full md:max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Health</span>
            <span className="text-sm font-bold ml-auto">
              {currentPlayer?.health || 0}/{currentPlayer?.maxHealth || 0}
            </span>
          </div>
          <Progress
            value={healthPercentage}
            className={`h-3 ${currentPlayer ? getHealthBarColor(currentPlayer.health, currentPlayer.maxHealth) : ''}`}
          />
        </div>

        <Badge variant="secondary" className="text-base px-4 py-2">
          Question {game.currentQuestionIndex + 1}/{game.questions.length}
        </Badge>

        <div className="flex items-center gap-3">
          <Timer className={`w-6 h-6 ${timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
          <span className={`text-4xl font-bold tabular-nums ${timeRemaining <= 5 ? 'text-red-600' : 'text-amber-600'}`}>
            {timeRemaining}
          </span>
        </div>
      </header>

      {/* Question & Answers */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-4xl">
          {isHost && (
            <div className="text-center mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-indigo-700 font-medium">Host View - Watching players answer</p>
            </div>
          )}
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-8 md:mb-12 text-slate-800 leading-tight">
            {currentQuestion.text}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const letter = ['A', 'B', 'C', 'D'][idx];

              return (
                <Button
                  key={idx}
                  variant="outline"
                  size="lg"
                  disabled={hasAnswered || isHost}
                  onClick={() => {
                    if (!isHost) {
                      handleAnswerSelect(idx);
                      handleAnswerSubmit(idx);
                    }
                  }}
                  className={`h-auto min-h-28 text-base md:text-lg font-medium transition-all duration-200 justify-start text-left px-6 py-4
                    ${isSelected
                      ? 'border-indigo-600 bg-indigo-50 shadow-lg scale-105'
                      : 'hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md'
                    }
                    ${hasAnswered || isHost ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-bold mr-4 flex-shrink-0">
                    {letter}
                  </span>
                  <span className="flex-1">{option}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Mini Leaderboard */}
      <footer className="border-t p-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600">Current Standings</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLeaderboard(!showLeaderboard)}
            >
              {showLeaderboard ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
          </div>

          {showLeaderboard && topPlayers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 animate-in slide-in-from-bottom-2 duration-300">
              {topPlayers.map((player, idx) => (
                <Card key={player.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant={idx < 3 ? 'default' : 'secondary'}
                        className="text-xs w-6 h-6 flex items-center justify-center p-0"
                      >
                        {idx + 1}
                      </Badge>
                      <img
                        src={getAvatarUrl(player.avatarStyle, player.avatarSeed, player.avatarColor) || "/placeholder.svg"}
                        className="w-8 h-8 rounded-full ring-2 ring-white shadow"
                        alt={player.name}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{player.name}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Progress value={(player.health / player.maxHealth) * 100} className="h-2" />
                      <p className="text-xs text-slate-600 flex justify-between">
                        <span>{player.health} HP</span>
                        <span className="font-semibold">{player.points} pts</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
