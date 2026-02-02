'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { mockGameStore } from '@/lib/mock-game-store';
import { getAvatarUrl } from '@/lib/game-utils';
import Loading from './loading';

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [game, setGame] = useState<any>(null);

  const answerIndex = parseInt(searchParams.get('answer') ?? '-1');
  const isCorrect = searchParams.get('correct') === 'true';
  const pointsEarned = parseInt(searchParams.get('points') ?? '0');

  useEffect(() => {
    const gameData = mockGameStore.getGame(resolvedParams.code);
    if (!gameData) {
      router.push('/');
      return;
    }

    setGame(gameData);

    // Update player stats (mock)
    if (gameData.players.length > 0) {
      const player = gameData.players[0];
      const healthChange = isCorrect ? gameData.settings.healthGainCorrect : -gameData.settings.healthLossWrong;
      const newHealth = Math.max(0, Math.min(player.maxHealth, player.health + healthChange));
      const newPoints = player.points + pointsEarned;

      mockGameStore.updatePlayer(resolvedParams.code, player.id, {
        health: newHealth,
        points: newPoints,
      });
    }
  }, [resolvedParams.code, router, isCorrect, pointsEarned]);

  useEffect(() => {
    if (!game) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Move to next question or final results
          const hasMoreQuestions = mockGameStore.nextQuestion(resolvedParams.code);
          if (hasMoreQuestions) {
            router.push(`/game/${resolvedParams.code}`);
          } else {
            router.push(`/game/${resolvedParams.code}/final`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [game, resolvedParams.code, router]);

  if (!game) {
    return <Loading />;
  }

  const currentQuestion = game.questions[game.currentQuestionIndex];
  const correctAnswer = currentQuestion.options[currentQuestion.correctIndex];
  const currentPlayer = game.players[0];
  const healthChange = isCorrect ? game.settings.healthGainCorrect : -game.settings.healthLossWrong;
  const newHealth = Math.max(0, Math.min(currentPlayer.maxHealth, currentPlayer.health + healthChange));
  const newPoints = currentPlayer.points + pointsEarned;

  // Mock rank changes for demo
  const topPlayers = [...game.players]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map((p, idx) => ({
      ...p,
      rankChange: idx === 0 ? 2 : idx === 1 ? -1 : 0,
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
          <div className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Correct Answer:</p>
            <p className="text-lg font-semibold text-slate-800">
              {String.fromCharCode(65 + currentQuestion.correctIndex)}. {correctAnswer}
            </p>
          </div>

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
                  <Progress value={(newHealth / currentPlayer.maxHealth) * 100} className="h-3" />
                  <p className="text-xs text-slate-500">
                    {newHealth}/{currentPlayer.maxHealth} HP
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
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:shadow-md transition-shadow"
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
              Next question in <span className="font-bold text-indigo-600">{countdown}s</span>...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
