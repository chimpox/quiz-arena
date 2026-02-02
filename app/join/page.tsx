'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { AVATAR_STYLES, COLOR_PALETTES, getAvatarUrl } from '@/lib/game-utils';
import type { AvatarStyle } from '@/lib/types';

export default function JoinPage() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('avataaars');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTES[0]);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Generate avatar seed from name (without color for cleaner seed)
  const avatarSeed = displayName || 'preview';
  const avatarUrl = getAvatarUrl(avatarStyle, avatarSeed, selectedColor);

  const handleJoin = async () => {
    setError('');

    // Validation
    if (!gameCode || gameCode.length !== 6) {
      setError('Please enter a valid 6-digit game code');
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }

    setIsJoining(true);

    // Simulate joining (replace with actual API call)
    setTimeout(() => {
      // Store player info in sessionStorage
      sessionStorage.setItem('playerInfo', JSON.stringify({
        name: displayName,
        avatarStyle,
        avatarSeed,
        avatarColor: selectedColor,
        gameCode,
      }));

      // Navigate to lobby
      router.push(`/lobby/${gameCode}`);
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 p-4">
      {/* Back button */}
      <div className="w-full max-w-md mb-4">
        <Link href="/">
          <Button variant="ghost" className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Join Arena
          </CardTitle>
          <CardDescription className="text-center">
            Enter your game code and customize your avatar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Game Code */}
          <div className="space-y-2">
            <Label htmlFor="gameCode">Game Code</Label>
            <Input
              id="gameCode"
              placeholder="000000"
              maxLength={6}
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.replace(/\D/g, ''))}
              className="text-2xl font-mono text-center tracking-widest h-14"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
            />
          </div>

          {/* Avatar Customization */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Choose Your Avatar
            </Label>

            {/* Avatar Style Selector */}
            <Select value={avatarStyle} onValueChange={(value) => setAvatarStyle(value as AvatarStyle)}>
              <SelectTrigger>
                <SelectValue placeholder="Avatar Style" />
              </SelectTrigger>
              <SelectContent>
                {AVATAR_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Color Palette */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Color Theme</p>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PALETTES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? 'border-indigo-600 scale-110 shadow-lg'
                        : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Avatar Preview */}
            <div className="flex justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-slate-200">
              <div className="relative">
                <img
                  src={avatarUrl || "/placeholder.svg"}
                  alt="Avatar Preview"
                  className="w-32 h-32 rounded-full ring-4 ring-white shadow-xl"
                />
                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          {/* Join Button */}
          <Button
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            size="lg"
          >
            {isJoining ? 'Joining...' : 'Enter Arena'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
