'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft, Play, Info, Heart, Clock, Zap } from 'lucide-react';
import Link from 'next/link';
import { mockGameStore, SAMPLE_QUESTIONS } from '@/lib/mock-game-store';
import type { GameSettings, Question } from '@/lib/types';

export default function HostPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<GameSettings>({
    startingHealth: 10,
    maxHealth: 15,
    healthGainCorrect: 1,
    healthLossWrong: 1,
    questionTimeLimit: 10,
  });
  const [questionsText, setQuestionsText] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGame = () => {
    setError('');

    // Validate settings
    if (settings.startingHealth < 5 || settings.startingHealth > 20) {
      setError('Starting health must be between 5 and 20');
      return;
    }

    if (settings.maxHealth < 10 || settings.maxHealth > 25) {
      setError('Max health must be between 10 and 25');
      return;
    }

    if (settings.maxHealth < settings.startingHealth) {
      setError('Max health must be greater than or equal to starting health');
      return;
    }

    // Parse questions or use sample
    let questions: Question[] = SAMPLE_QUESTIONS;

    if (questionsText.trim()) {
      try {
        const parsed = JSON.parse(questionsText);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          setError('Questions must be a non-empty array');
          return;
        }

        questions = parsed.map((q: any, idx: number) => ({
          id: `q${idx + 1}`,
          text: q.question || q.text,
          options: q.options || [],
          correctIndex: q.correct || q.correctIndex || 0,
          timeLimit: q.timeLimit || settings.questionTimeLimit,
        }));

        // Validate questions
        for (const q of questions) {
          if (!q.text || !q.options || q.options.length < 2) {
            setError('Each question must have text and at least 2 options');
            return;
          }
        }
      } catch (err) {
        setError('Invalid JSON format. Please check your questions.');
        return;
      }
    }

    setIsCreating(true);

    // Create game
    const hostId = `host-${Date.now()}`;
    const game = mockGameStore.createGame(hostId, settings, questions);

    // Store host info
    sessionStorage.setItem('hostInfo', JSON.stringify({
      hostId,
      gameCode: game.code,
    }));

    // Navigate to lobby
    setTimeout(() => {
      router.push(`/lobby/${game.code}`);
    }, 500);
  };

  const loadSampleQuestions = () => {
    const sampleJSON = JSON.stringify([
      {
        question: "What is 2+2?",
        options: ["3", "4", "5", "6"],
        correct: 1
      },
      {
        question: "Which is the largest planet?",
        options: ["Earth", "Jupiter", "Mars", "Venus"],
        correct: 1
      }
    ], null, 2);
    setQuestionsText(sampleJSON);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <Link href="/">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
        {/* Left Column - Game Configuration */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Play className="w-6 h-6 text-indigo-600" />
              Game Setup
            </CardTitle>
            <CardDescription>Configure your quiz game settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Health Settings */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Heart className="w-4 h-4 text-red-500" />
                Health System
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startingHealth">Starting Health</Label>
                  <Input
                    id="startingHealth"
                    type="number"
                    min="5"
                    max="20"
                    value={settings.startingHealth}
                    onChange={(e) => setSettings({ ...settings, startingHealth: parseInt(e.target.value) || 5 })}
                  />
                  <p className="text-xs text-muted-foreground">Initial HP (5-20)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxHealth">Max Health</Label>
                  <Input
                    id="maxHealth"
                    type="number"
                    min="10"
                    max="25"
                    value={settings.maxHealth}
                    onChange={(e) => setSettings({ ...settings, maxHealth: parseInt(e.target.value) || 10 })}
                  />
                  <p className="text-xs text-muted-foreground">Max HP (10-25)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="healthGain">Health Gain</Label>
                  <Input
                    id="healthGain"
                    type="number"
                    min="1"
                    max="3"
                    value={settings.healthGainCorrect}
                    onChange={(e) => setSettings({ ...settings, healthGainCorrect: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground">Per correct answer</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="healthLoss">Health Loss</Label>
                  <Input
                    id="healthLoss"
                    type="number"
                    min="1"
                    max="3"
                    value={settings.healthLossWrong}
                    onChange={(e) => setSettings({ ...settings, healthLossWrong: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground">Per wrong answer</p>
                </div>
              </div>
            </div>

            {/* Timer Settings */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <Label htmlFor="questionTimer">Question Timer (seconds)</Label>
              </div>
              <Input
                id="questionTimer"
                type="number"
                min="5"
                max="20"
                value={settings.questionTimeLimit}
                onChange={(e) => setSettings({ ...settings, questionTimeLimit: parseInt(e.target.value) || 10 })}
              />
              <p className="text-xs text-muted-foreground">Time limit per question (5-20s)</p>
            </div>

            {/* Questions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="questions">Questions (JSON)</Label>
                <Button variant="outline" size="sm" onClick={loadSampleQuestions}>
                  Load Sample
                </Button>
              </div>
              <Textarea
                id="questions"
                placeholder='Paste questions here or leave empty to use sample questions...'
                className="min-h-32 font-mono text-sm"
                value={questionsText}
                onChange={(e) => setQuestionsText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use 5 sample questions
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <p className="text-sm">{error}</p>
              </Alert>
            )}

            {/* Create Button */}
            <Button
              onClick={handleCreateGame}
              disabled={isCreating}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              size="lg"
            >
              {isCreating ? 'Creating Game...' : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Create Game
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column - Instructions */}
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              {/* Question Format */}
              <div>
                <h4 className="font-semibold mb-2 text-slate-800">Question Format</h4>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
{`[
  {
    "question": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
    "correct": 1
  },
  {
    "question": "Capital of France?",
    "options": ["London", "Paris", "Berlin"],
    "correct": 1
  }
]`}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  The <code className="bg-slate-200 px-1 rounded">correct</code> field is the index (0-based) of the correct option.
                </p>
              </div>

              {/* Health System */}
              <div>
                <h4 className="font-semibold mb-2 text-slate-800">Health System Explained</h4>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
                  <p className="text-slate-700">
                    Players start with high health (default 10). Correct answers restore health,
                    wrong answers reduce it. Elimination only happens at 0 health - which should be rare!
                  </p>
                  <p className="text-slate-700">
                    The goal is to encourage engagement and learning, not eliminate players quickly.
                    Higher starting health = more forgiving gameplay.
                  </p>
                </div>
              </div>

              {/* Tips */}
              <div>
                <h4 className="font-semibold mb-2 text-slate-800">Best Practices</h4>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex gap-2">
                    <span className="text-indigo-600">•</span>
                    <span>Keep questions concise and clear</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-indigo-600">•</span>
                    <span>Match timer to question difficulty</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-indigo-600">•</span>
                    <span>Higher starting health = more forgiving</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-indigo-600">•</span>
                    <span>Test with sample questions first</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-indigo-600">•</span>
                    <span>Aim for 5-15 questions per game</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
