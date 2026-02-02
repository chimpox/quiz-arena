'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Home, RotateCcw, Sparkles } from 'lucide-react';
import { mockGameStore } from '@/lib/mock-game-store';
import { getAvatarUrl } from '@/lib/game-utils';
import Link from 'next/link';

export default function FinalResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const gameData = mockGameStore.getGame(resolvedParams.code);
    if (!gameData) {
      router.push('/');
      return;
    }

    setGame(gameData);

    // Hide confetti after animation
    setTimeout(() => setShowConfetti(false), 3000);
  }, [resolvedParams.code, router]);

  if (!game) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const sortedPlayers = [...game.players].sort((a, b) => {
    // Sort by points first, then by health
    if (b.points !== a.points) return b.points - a.points;
    return b.health - a.health;
  });

  const winner = sortedPlayers[0];
  const podium = sortedPlayers.slice(0, 3);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 1:
        return <Medal className="w-7 h-7 text-slate-400" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-700" />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 0:
        return 'from-yellow-400 to-yellow-600';
      case 1:
        return 'from-slate-300 to-slate-500';
      case 2:
        return 'from-amber-600 to-amber-800';
      default:
        return 'from-slate-200 to-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 py-8 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-white/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Trophy className="w-12 h-12 text-yellow-300" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Game Over!</h1>
          <p className="text-xl text-white/90">Final Results</p>
        </div>

        {/* Winner Spotlight */}
        <Card className="mb-8 shadow-2xl animate-in zoom-in-95 duration-700 delay-200">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className={`absolute -inset-4 bg-gradient-to-r ${getRankColor(0)} rounded-full blur-xl opacity-50 animate-pulse`} />
                <img
                  src={getAvatarUrl(winner.avatarStyle, winner.avatarSeed, winner.avatarColor) || "/placeholder.svg"}
                  alt={winner.name}
                  className="w-32 h-32 rounded-full ring-8 ring-white shadow-2xl relative"
                />
                <div className="absolute -bottom-2 -right-2 bg-yellow-500 rounded-full p-3 shadow-lg">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <Badge className="mb-2 bg-yellow-500 text-white">Champion</Badge>
                <h2 className="text-4xl font-bold text-slate-800 mb-2">{winner.name}</h2>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-indigo-600">{winner.points}</span>
                    <span className="text-slate-600">points</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600">{winner.health}</span>
                    <span className="text-slate-600">HP remaining</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Podium */}
        {podium.length > 1 && (
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom duration-700 delay-300">
            {/* 2nd Place */}
            {podium[1] && (
              <Card className="mt-8 shadow-xl hover:shadow-2xl transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-3">
                    <Badge variant="secondary" className="w-10 h-10 flex items-center justify-center text-xl">
                      2
                    </Badge>
                  </div>
                  <img
                    src={getAvatarUrl(podium[1].avatarStyle, podium[1].avatarSeed, podium[1].avatarColor) || "/placeholder.svg"}
                    alt={podium[1].name}
                    className="w-20 h-20 rounded-full mx-auto mb-3 ring-4 ring-slate-300 shadow-lg"
                  />
                  <p className="font-semibold text-slate-800 truncate">{podium[1].name}</p>
                  <p className="text-sm text-slate-600 mt-1">{podium[1].points} pts</p>
                </CardContent>
              </Card>
            )}

            {/* 1st Place (centered, already shown above in spotlight) */}
            <div className="opacity-0" />

            {/* 3rd Place */}
            {podium[2] && (
              <Card className="mt-12 shadow-xl hover:shadow-2xl transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-3">
                    <Badge variant="secondary" className="w-10 h-10 flex items-center justify-center text-xl">
                      3
                    </Badge>
                  </div>
                  <img
                    src={getAvatarUrl(podium[2].avatarStyle, podium[2].avatarSeed, podium[2].avatarColor) || "/placeholder.svg"}
                    alt={podium[2].name}
                    className="w-20 h-20 rounded-full mx-auto mb-3 ring-4 ring-amber-700 shadow-lg"
                  />
                  <p className="font-semibold text-slate-800 truncate">{podium[2].name}</p>
                  <p className="text-sm text-slate-600 mt-1">{podium[2].points} pts</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Full Leaderboard */}
        <Card className="shadow-2xl mb-8 animate-in fade-in duration-700 delay-500">
          <CardContent className="p-6">
            <h3 className="text-2xl font-bold mb-6 text-center text-slate-800">Final Standings</h3>
            <div className="space-y-3">
              {sortedPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    idx < 3
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200'
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12">
                      {idx < 3 ? (
                        getRankIcon(idx)
                      ) : (
                        <span className="text-2xl font-bold text-slate-400">{idx + 1}</span>
                      )}
                    </div>
                    <img
                      src={getAvatarUrl(player.avatarStyle, player.avatarSeed, player.avatarColor) || "/placeholder.svg"}
                      className="w-14 h-14 rounded-full ring-2 ring-white shadow-md"
                      alt={player.name}
                    />
                    <div>
                      <p className="font-semibold text-lg text-slate-800">{player.name}</p>
                      <p className="text-sm text-slate-600">{player.health} HP</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{player.points}</p>
                    <p className="text-xs text-slate-500">points</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in duration-700 delay-700">
          <Link href="/">
            <Button size="lg" variant="outline" className="bg-white hover:bg-slate-50 w-full sm:w-auto">
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link href="/host">
            <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 w-full sm:w-auto">
              <RotateCcw className="w-5 h-5 mr-2" />
              Play Again
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
