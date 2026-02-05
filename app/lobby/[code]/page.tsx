'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Play, Users, Clock, Heart, Copy, CheckCheck } from 'lucide-react';
import { getAvatarUrl } from '@/lib/game-utils';
import { usePusher } from '@/hooks/use-pusher';
import type { Player, GameSettings, HostSessionInfo, PlayerSessionInfo } from '@/lib/types';

interface LobbyState {
  code: string;
  status: string;
  settings: GameSettings;
  questionsCount: number;
  players: Player[];
}

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [game, setGame] = useState<LobbyState | null>(null);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

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
          setGame({
            code: data.game.code,
            status: data.game.status,
            settings: data.game.settings,
            questionsCount: data.game.questionsCount,
            players: data.game.players,
          });
          setPlayers(data.game.players);

          // If game has started, redirect to game page
          if (data.game.status === 'playing') {
            router.push(`/game/${resolvedParams.code}`);
          }
        }
      } catch (err) {
        console.error('Failed to fetch game:', err);
        router.push('/');
      }
    };

    fetchGame();
  }, [resolvedParams.code, router, hostToken, playerToken]);

  // Pusher event handlers
  const handlePlayerJoined = useCallback((data: { player: Player }) => {
    setPlayers((prev) => {
      // Check if player already exists
      if (prev.some((p) => p.id === data.player.id)) {
        return prev;
      }
      return [...prev, data.player];
    });
  }, []);

  const handlePlayerLeft = useCallback((data: { playerId: string }) => {
    setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
  }, []);

  const handleGameStarted = useCallback(() => {
    router.push(`/game/${resolvedParams.code}`);
  }, [router, resolvedParams.code]);

  const handleLobbyUpdate = useCallback((data: { players: Player[]; questionsCount: number }) => {
    setPlayers(data.players);
    setGame((prev) => prev ? { ...prev, questionsCount: data.questionsCount, players: data.players } : null);
  }, []);

  // Set up Pusher connection
  const { isConnected } = usePusher({
    gameCode: resolvedParams.code,
    userId: isHost ? hostId || undefined : playerId || undefined,
    userName: isHost ? 'Host' : players.find((p) => p.id === playerId)?.name,
    userRole: isHost ? 'host' : 'player',
    onPlayerJoined: handlePlayerJoined,
    onPlayerLeft: handlePlayerLeft,
    onGameStarted: handleGameStarted,
    onLobbyUpdate: handleLobbyUpdate,
  });

  const handleStartGame = async () => {
    if (!hostId || !hostToken) return;

    setIsStarting(true);
    setError('');

    try {
      const response = await fetch(`/api/game/${resolvedParams.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, hostToken }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to start game');
        setIsStarting(false);
        return;
      }

      // Pusher will broadcast game-started, but we can navigate immediately
      router.push(`/game/${resolvedParams.code}`);
    } catch (err) {
      console.error('Failed to start game:', err);
      setError('Failed to start game. Please try again.');
      setIsStarting(false);
    }
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(resolvedParams.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex items-center gap-2 text-slate-600">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
          <span>{isConnected ? 'Loading game...' : 'Connecting...'}</span>
        </div>
      </div>
    );
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
              <p className="text-3xl font-bold">{game.questionsCount}</p>
              <p className="text-sm text-indigo-100">Questions</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-amber-400'}`} />
              <span className="text-sm text-indigo-100">{isConnected ? 'Connected' : 'Connecting...'}</span>
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
          {/* Error Message */}
          {error && (
            <div className="text-center text-red-600 text-sm">{error}</div>
          )}

          {/* Game Settings Summary */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 justify-center">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span>Starting Health: <strong>{game.settings.startingHealth}</strong></span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Timer: <strong>{game.settings.questionTimeLimit}s</strong></span>
            </div>
            <span className="text-slate-300">|</span>
            <span>Max Health: <strong>{game.settings.maxHealth}</strong></span>
          </div>

          {/* Action Button */}
          {isHost ? (
            <Button
              onClick={handleStartGame}
              disabled={players.length === 0 || isStarting}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              {isStarting ? 'Starting...' : 'Start Game'}
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
