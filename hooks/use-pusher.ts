'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getPusherClient, gameChannel, PUSHER_EVENTS, setUserInfo } from '@/lib/pusher-client';
import type { Channel, PresenceChannel } from 'pusher-js';
import type { Player, Question } from '@/lib/types';

interface UsePusherOptions {
  gameCode: string;
  userId?: string;
  userName?: string;
  userRole?: 'host' | 'player';
  onPlayerJoined?: (data: { player: Player }) => void;
  onPlayerLeft?: (data: { playerId: string; playerName: string }) => void;
  onGameStarted?: (data: { questions: Question[]; currentQuestionIndex: number; players: Player[] }) => void;
  onAnswerSubmitted?: (data: { playerId: string; answeredCount: number; totalPlayers: number }) => void;
  onQuestionResults?: (data: { correctIndex: number; players: Player[]; answers: Record<string, any> }) => void;
  onNextQuestion?: (data: { questionIndex: number; question: Question; players: Player[] }) => void;
  onGameEnded?: (data: { finalStandings: Player[] }) => void;
  onLobbyUpdate?: (data: { players: Player[]; questionsCount: number }) => void;
}

interface UsePusherReturn {
  isConnected: boolean;
  channel: Channel | null;
  members: Map<string, { name: string; role: string }>;
}

export function usePusher(options: UsePusherOptions): UsePusherReturn {
  const {
    gameCode,
    userId,
    userName,
    userRole,
    onPlayerJoined,
    onPlayerLeft,
    onGameStarted,
    onAnswerSubmitted,
    onQuestionResults,
    onNextQuestion,
    onGameEnded,
    onLobbyUpdate,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [members, setMembers] = useState<Map<string, { name: string; role: string }>>(new Map());

  const channelRef = useRef<Channel | null>(null);
  const subscribedRef = useRef(false);

  // Store callbacks in refs to avoid re-subscriptions
  const callbacksRef = useRef({
    onPlayerJoined,
    onPlayerLeft,
    onGameStarted,
    onAnswerSubmitted,
    onQuestionResults,
    onNextQuestion,
    onGameEnded,
    onLobbyUpdate,
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onPlayerJoined,
      onPlayerLeft,
      onGameStarted,
      onAnswerSubmitted,
      onQuestionResults,
      onNextQuestion,
      onGameEnded,
      onLobbyUpdate,
    };
  }, [onPlayerJoined, onPlayerLeft, onGameStarted, onAnswerSubmitted, onQuestionResults, onNextQuestion, onGameEnded, onLobbyUpdate]);

  useEffect(() => {
    if (!gameCode || subscribedRef.current) return;

    try {
      // Set user info before getting pusher client
      setUserInfo(userId, userName, userRole);
      const pusher = getPusherClient();

      const channelName = gameChannel(gameCode);
      const presenceChannel = pusher.subscribe(channelName) as PresenceChannel;

      channelRef.current = presenceChannel;
      setChannel(presenceChannel);
      subscribedRef.current = true;

      // Connection state
      presenceChannel.bind('pusher:subscription_succeeded', (memberData: any) => {
        setIsConnected(true);
        if (memberData.members) {
          const newMembers = new Map<string, { name: string; role: string }>();
          Object.entries(memberData.members).forEach(([id, info]: [string, any]) => {
            newMembers.set(id, { name: info.name, role: info.role });
          });
          setMembers(newMembers);
        }
      });

      presenceChannel.bind('pusher:subscription_error', (error: any) => {
        console.error('Pusher subscription error:', error);
        setIsConnected(false);
      });

      presenceChannel.bind('pusher:member_added', (member: any) => {
        setMembers((prev) => {
          const newMembers = new Map(prev);
          newMembers.set(member.id, member.info);
          return newMembers;
        });
      });

      presenceChannel.bind('pusher:member_removed', (member: any) => {
        setMembers((prev) => {
          const newMembers = new Map(prev);
          newMembers.delete(member.id);
          return newMembers;
        });
      });

      // Game events
      presenceChannel.bind(PUSHER_EVENTS.PLAYER_JOINED, (data: any) => {
        callbacksRef.current.onPlayerJoined?.(data);
      });

      presenceChannel.bind(PUSHER_EVENTS.PLAYER_LEFT, (data: any) => {
        callbacksRef.current.onPlayerLeft?.(data);
      });

      presenceChannel.bind(PUSHER_EVENTS.GAME_STARTED, (data: any) => {
        callbacksRef.current.onGameStarted?.(data);
      });

      presenceChannel.bind(PUSHER_EVENTS.ANSWER_SUBMITTED, (data: any) => {
        callbacksRef.current.onAnswerSubmitted?.(data);
      });

      presenceChannel.bind(PUSHER_EVENTS.QUESTION_RESULTS, (data: any) => {
        callbacksRef.current.onQuestionResults?.(data);
      });

      presenceChannel.bind(PUSHER_EVENTS.NEXT_QUESTION, (data: any) => {
        callbacksRef.current.onNextQuestion?.(data);
      });

      presenceChannel.bind(PUSHER_EVENTS.GAME_ENDED, (data: any) => {
        callbacksRef.current.onGameEnded?.(data);
      });

      presenceChannel.bind(PUSHER_EVENTS.LOBBY_UPDATE, (data: any) => {
        callbacksRef.current.onLobbyUpdate?.(data);
      });

      // Cleanup
      return () => {
        presenceChannel.unbind_all();
        pusher.unsubscribe(channelName);
        channelRef.current = null;
        subscribedRef.current = false;
        setIsConnected(false);
        setChannel(null);
      };
    } catch (error) {
      console.error('Pusher connection error:', error);
      setIsConnected(false);
    }
  }, [gameCode, userId, userName, userRole]);

  return { isConnected, channel, members };
}

export default usePusher;
