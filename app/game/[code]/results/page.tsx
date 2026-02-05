'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getAvatarUrl } from '@/lib/game-utils';
import { usePusher } from '@/hooks/use-pusher';
import type { Player, Question, GameSettings, HostSessionInfo, PlayerSessionInfo } from '@/lib/types';
import Loading from './loading';

interface GameState {
  code: string;
  status: string;
  settings: GameSettings;
  questions: Question[];
  players: Player[];
  currentQuestionIndex: number;
}

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [game, setGame] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerToken, setPlayerToken] = useState<string | null>(null);

  const answerIndex = parseInt(searchParams.get('answer') ?? '-1');
  const isCorrect = searchParams.get('correct') === 'true';
  const pointsEarned = parseInt(searchParams.get('points') ?? '0');
  const healthChange = parseInt(searchParams.get('healthChange') ?? '0');

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

  // Fetch game state
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
          // If game has already moved to final results, redirect there
          if (data.game.status === 'final-results') {
            router.push(`/game/${resolvedParams.code}/final`);
            return;
          }

          // If game is back in lobby (shouldn't happen), redirect
          if (data.game.status === 'lobby') {
            router.push(`/lobby/${resolvedParams.code}`);
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
        }
      } catch (err) {
        console.error('Failed to fetch game:', err);
        router.push('/');
      }
    };

    fetchGame();
  }, [resolvedParams.code, router, hostToken, playerToken, playerId]);

  // Pusher event handlers
  const handleNextQuestion = useCallback((data: { questionIndex: number; question: Question; players: Player[] }) => {
    router.push(`/game/${resolvedParams.code}`);
  }, [router, resolvedParams.code]);

  const handleGameEnded = useCallback(() => {
    router.push(`/game/${resolvedParams.code}/final`);
  }, [router, resolvedParams.code]);

  // Set up Pusher connection
  usePusher({
    gameCode: resolvedParams.code,
    userId: isHost ? hostId || undefined : playerId || undefined,
    userName: isHost ? 'Host' : currentPlayer?.name,
    userRole: isHost ? 'host' : 'player',
    onNextQuestion: handleNextQuestion,
    onGameEnded: handleGameEnded,
  });

  // Function to advance game (host only)
  const advanceGame = useCallback(async () => {
    if (!hostId || !hostToken) return;

    try {
      const response = await fetch(`/api/game/${resolvedParams.code}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, hostToken }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.hasMore) {
          router.push(`/game/${resolvedParams.code}`);
        } else {
          router.push(`/game/${resolvedParams.code}/final`);
        }
      }
    } catch (err) {
      console.error('Failed to advance game:', err);
      // Fallback navigation
      if (game && game.questions && game.currentQuestionIndex < game.questions.length - 1) {
        router.push(`/game/${resolvedParams.code}`);
      } else {
        router.push(`/game/${resolvedParams.code}/final`);
      }
    }
  }, [hostId, hostToken, resolvedParams.code, router, game]);

  // Countdown timer for everyone
  useEffect(() => {
    if (!game) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [game]);

  // Handle countdown reaching 0 - separate effect to avoid setState during render
  useEffect(() => {
    if (countdown !== 0 || !game) return;

    if (isHost && hostId && hostToken) {
      // Host: advance the game via API
      advanceGame();
    } else if (!isHost) {
      // Player: poll API to check if game has moved on (fallback if Pusher fails)
      const checkGameState = async () => {
        try {
          const response = await fetch(`/api/game/${resolvedParams.code}`, {
            headers: playerToken ? { 'x-player-token': playerToken } : {},
          });
          const data = await response.json();
          if (data.success && data.game) {
            if (data.game.status === 'final-results') {
              router.push(`/game/${resolvedParams.code}/final`);
            } else if (data.game.status === 'playing') {
              // Game has moved to next question
              router.push(`/game/${resolvedParams.code}`);
            }
          }
        } catch (err) {
          console.error('Failed to check game state:', err);
        }
      };
      // Small delay then check
      setTimeout(checkGameState, 1000);
    }
  }, [countdown, game, isHost, hostId, hostToken, playerToken, resolvedParams.code, router, advanceGame]);

  if (!game) {
    return <Loading />;
  }

  const currentQuestion = game.questions?.[game.currentQuestionIndex];
  const correctAnswer = currentQuestion?.options?.[currentQuestion?.correctIndex] || 'N/A';

  // Calculate new health for display
  const playerHealth = currentPlayer?.health || 10;
  const playerMaxHealth = currentPlayer?.maxHealth || 15;
  const newHealth = Math.max(0, Math.min(playerMaxHealth, playerHealth));
  const newPoints = currentPlayer?.points || 0;

  // Sort players by points for leaderboard
  const topPlayers = [...game.players]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map((p, idx, arr) => ({
      ...p,
      rankChange: 0, // Could track previous ranks for real rank changes
    }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-3xl animate-in zoom-in-95 duration-300 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {isCorrect ? (
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-50 duration-500">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center animate-in zoom-in-50 duration-500">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            )}
          </div>
          <CardTitle className="text-3xl md:text-4xl">
            {isCorrect ? (
              <span className="text-green-600">Correct!</span>
            ) : (
              <span className="text-red-600">Incorrect</span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Correct Answer */}
          {currentQuestion && (
            <div className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Correct Answer:</p>
              <p className="text-lg font-semibold text-slate-800">
                {String.fromCharCode(65 + currentQuestion.correctIndex)}. {correctAnswer}
              </p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Health Change */}
            <Card className="border-2 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-slate-600 mb-2">Health Change</p>
                <div
                  className={`text-4xl font-bold mb-3 animate-in slide-in-from-bottom-4 duration-500 ${
                    healthChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {healthChange > 0 ? '+' : ''}{healthChange} HP
                </div>
                <div className="mt-3 space-y-2">
                  <Progress value={(newHealth / playerMaxHealth) * 100} className="h-3" />
                  <p className="text-xs text-slate-500">
                    {newHealth}/{playerMaxHealth} HP
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Points Earned */}
            <Card className="border-2 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-slate-600 mb-2">Points Earned</p>
                <div className="text-4xl font-bold text-indigo-600 mb-3 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                  +{pointsEarned}
                </div>
                <p className="text-sm text-slate-500 mt-3">Total: {newPoints} pts</p>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Leaderboard</h3>
              <Badge variant="secondary">Top 5</Badge>
            </div>
            <div className="space-y-3">
              {topPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:shadow-md transition-shadow ${
                    player.id === playerId ? 'ring-2 ring-indigo-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={idx < 3 ? 'default' : 'secondary'}
                      className="w-8 h-8 flex items-center justify-center text-base"
                    >
                      {idx + 1}
                    </Badge>
                    <img
                      src={getAvatarUrl(player.avatarStyle, player.avatarSeed, player.avatarColor) || "/placeholder.svg"}
                      className="w-12 h-12 rounded-full ring-2 ring-white shadow"
                      alt={player.name}
                    />
                    <div>
                      <p className="font-medium text-slate-800">{player.name}</p>
                      <p className="text-xs text-slate-500">{player.health} HP</p>
                    </div>
                    {player.rankChange !== 0 && (
                      <Badge
                        variant={player.rankChange > 0 ? 'default' : 'destructive'}
                        className="ml-2"
                      >
                        {player.rankChange > 0 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : player.rankChange < 0 ? (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        ) : (
                          <Minus className="w-3 h-3 mr-1" />
                        )}
                        {Math.abs(player.rankChange)}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-slate-800">{player.points}</p>
                    <p className="text-xs text-slate-500">points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Countdown */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-slate-600">
              {countdown > 0 ? (
                <>Next question in <span className="font-bold text-indigo-600">{countdown}s</span>...</>
              ) : (
                <span className="font-bold text-indigo-600">Loading next question...</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
