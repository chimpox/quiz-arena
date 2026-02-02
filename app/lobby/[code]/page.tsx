'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Play, Users, Clock, Heart, Copy, CheckCheck } from 'lucide-react';
import { mockGameStore } from '@/lib/mock-game-store';
import { getAvatarUrl } from '@/lib/game-utils';
import type { Player } from '@/lib/types';

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [game, setGame] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if user is host
    const hostInfo = sessionStorage.getItem('hostInfo');
    const playerInfo = sessionStorage.getItem('playerInfo');

    if (hostInfo) {
      const { hostId, gameCode } = JSON.parse(hostInfo);
      if (gameCode === resolvedParams.code) {
        setIsHost(true);
      }
    }

    // Get game data
    const gameData = mockGameStore.getGame(resolvedParams.code);
    if (!gameData) {
      // Game not found, redirect to home
      router.push('/');
      return;
    }

    setGame(gameData);

    // If player joining, add them to the game
    if (playerInfo && !isHost) {
      const info = JSON.parse(playerInfo);
      if (info.gameCode === resolvedParams.code) {
        const player: Player = {
          id: `player-${Date.now()}`,
          name: info.name,
          avatarStyle: info.avatarStyle,
          avatarSeed: info.avatarSeed,
          avatarColor: info.avatarColor,
          health: gameData.settings.startingHealth,
          maxHealth: gameData.settings.maxHealth,
          points: 0,
          isReady: true,
          isEliminated: false,
        };

        mockGameStore.joinGame(resolvedParams.code, player);
      }
    }

    // Mock: Add some sample players for demo
    if (gameData.players.length === 0) {
      const samplePlayers: Player[] = [
        {
          id: 'p1',
          name: 'Alice',
          avatarStyle: 'avataaars',
          avatarSeed: 'alice',
          avatarColor: '#FF6B6B',
          health: gameData.settings.startingHealth,
          maxHealth: gameData.settings.maxHealth,
          points: 0,
          isReady: true,
          isEliminated: false,
        },
        {
          id: 'p2',
          name: 'Bob',
          avatarStyle: 'bottts',
          avatarSeed: 'bob',
          avatarColor: '#4ECDC4',
          health: gameData.settings.startingHealth,
          maxHealth: gameData.settings.maxHealth,
          points: 0,
          isReady: true,
          isEliminated: false,
        },
        {
          id: 'p3',
          name: 'Charlie',
          avatarStyle: 'pixel-art',
          avatarSeed: 'charlie',
          avatarColor: '#45B7D1',
          health: gameData.settings.startingHealth,
          maxHealth: gameData.settings.maxHealth,
          points: 0,
          isReady: true,
          isEliminated: false,
        },
      ];

      samplePlayers.forEach(p => mockGameStore.joinGame(resolvedParams.code, p));
      setPlayers(samplePlayers);
    } else {
      setPlayers(gameData.players);
    }

    // Simulate real-time updates (replace with WebSocket)
    const interval = setInterval(() => {
      const updatedGame = mockGameStore.getGame(resolvedParams.code);
      if (updatedGame) {
        setPlayers([...updatedGame.players]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [resolvedParams.code, router, isHost]);

  const handleStartGame = () => {
    mockGameStore.startGame(resolvedParams.code);
    router.push(`/game/${resolvedParams.code}`);
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(resolvedParams.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!game) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Bar */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h2 className="text-4xl md:text-5xl font-mono font-bold tracking-wider">
                {resolvedParams.code}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyGameCode}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-sm text-indigo-100">Share this code with players</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{players.length}</p>
              <p className="text-sm text-indigo-100 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Players
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{game.questions.length}</p>
              <p className="text-sm text-indigo-100">Questions</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-slate-800 mb-2">
            {isHost ? 'Waiting for Players' : 'Players in Lobby'}
          </h3>
          <p className="text-slate-600">
            {isHost
              ? 'Players will appear here as they join. Start the game when ready!'
              : 'Waiting for the host to start the game...'}
          </p>
        </div>

        {/* Player Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          {players.map((player) => (
            <Card
              key={player.id}
              className="hover:shadow-xl transition-all duration-300 hover:scale-105 border-2"
            >
              <CardContent className="flex flex-col items-center p-6">
                <div className="relative mb-3">
                  <img
                    src={getAvatarUrl(player.avatarStyle, player.avatarSeed, player.avatarColor) || "/placeholder.svg"}
                    alt={player.name}
                    className="w-20 h-20 rounded-full ring-4 ring-white shadow-lg"
                  />
                  {player.isReady && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 shadow-lg">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="font-semibold text-center text-slate-800 truncate w-full">
                  {player.name}
                </p>
                <Badge variant="secondary" className="mt-2">
                  Ready
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {players.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No players yet</p>
            <p className="text-slate-400 text-sm">Share the game code to invite players</p>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <footer className="p-6 border-t bg-white shadow-lg">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Game Settings Summary */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 justify-center">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span>Starting Health: <strong>{game.settings.startingHealth}</strong></span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Timer: <strong>{game.settings.questionTimeLimit}s</strong></span>
            </div>
            <span className="text-slate-300">•</span>
            <span>Max Health: <strong>{game.settings.maxHealth}</strong></span>
          </div>

          {/* Action Button */}
          {isHost ? (
            <Button
              onClick={handleStartGame}
              disabled={players.length === 0}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-slate-600">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                <p className="text-lg font-medium">Waiting for host to start...</p>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
