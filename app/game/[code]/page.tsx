'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Timer, ChevronDown, ChevronUp } from 'lucide-react';
import { mockGameStore } from '@/lib/mock-game-store';
import { getAvatarUrl, calculatePoints, getHealthBarColor } from '@/lib/game-utils';
import type { Player } from '@/lib/types';

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    const gameData = mockGameStore.getGame(resolvedParams.code);
    if (!gameData) {
      router.push('/');
      return;
    }

    setGame(gameData);

    // Get current player (mock - using first player for demo)
    if (gameData.players.length > 0) {
      setCurrentPlayer(gameData.players[0]);
    }

    const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
    setTimeRemaining(currentQuestion.timeLimit);
  }, [resolvedParams.code, router]);

  useEffect(() => {
    if (!game || hasAnswered) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit
          handleAnswerSubmit(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [game, hasAnswered]);

  const handleAnswerSelect = (index: number) => {
    if (hasAnswered) return;
    setSelectedAnswer(index);
  };

  const handleAnswerSubmit = (answerIndex: number | null) => {
    if (hasAnswered) return;
    setHasAnswered(true);

    const currentQuestion = game.questions[game.currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const points = calculatePoints(isCorrect, timeRemaining, currentQuestion.timeLimit);

    // Navigate to results page after short delay
    setTimeout(() => {
      router.push(`/game/${resolvedParams.code}/results?answer=${answerIndex ?? -1}&correct=${isCorrect}&points=${points}`);
    }, 500);
  };

  if (!game || !currentPlayer) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const currentQuestion = game.questions[game.currentQuestionIndex];
  const healthPercentage = (currentPlayer.health / currentPlayer.maxHealth) * 100;
  const topPlayers = [...game.players]
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
              {currentPlayer.health}/{currentPlayer.maxHealth}
            </span>
          </div>
          <Progress value={healthPercentage} className={`h-3 ${getHealthBarColor(currentPlayer.health, currentPlayer.maxHealth)}`} />
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
                  disabled={hasAnswered}
                  onClick={() => {
                    handleAnswerSelect(idx);
                    handleAnswerSubmit(idx);
                  }}
                  className={`h-auto min-h-28 text-base md:text-lg font-medium transition-all duration-200 justify-start text-left px-6 py-4
                    ${isSelected
                      ? 'border-indigo-600 bg-indigo-50 shadow-lg scale-105'
                      : 'hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md'
                    }
                    ${hasAnswered ? 'opacity-50 cursor-not-allowed' : ''}
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

          {showLeaderboard && (
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
