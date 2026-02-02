'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trophy, Zap, Heart } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Logo/Title */}
        <div className="mb-6">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 bg-gradient-to-r from-white via-indigo-100 to-purple-100 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
            QuizArena
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Answer Fast. Stay Healthy. Dominate.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="flex flex-wrap justify-center gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex items-center gap-2 text-white/90">
            <Zap className="w-5 h-5" />
            <span className="text-sm font-medium">Real-time Competition</span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <Heart className="w-5 h-5" />
            <span className="text-sm font-medium">Health-Based Scoring</span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-medium">Live Leaderboard</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Link href="/host">
            <Button 
              size="lg" 
              className="w-full text-lg h-14 bg-white text-indigo-600 hover:bg-white/90 font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Host a Game
            </Button>
          </Link>
          <Link href="/join">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full text-lg h-14 bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Zap className="w-5 h-5 mr-2" />
              Join a Game
            </Button>
          </Link>
        </div>

        {/* Additional info */}
        <p className="mt-8 text-sm text-white/70 animate-in fade-in duration-700 delay-500">
          Enter 6-digit game codes to join competitive quiz battles
        </p>
      </div>
    </div>
  );
}
