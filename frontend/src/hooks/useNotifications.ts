/**
 * useNotifications Hook
 * Manages WebSocket connection to the notification server
 * Handles receiving and processing proactive messages
 */

import { useEffect, useCallback, useRef } from 'react';
import { WS_URL, WS_MAX_RECONNECT_ATTEMPTS, WS_MAX_RECONNECT_DELAY_MS } from '../config/constants';

export interface IncomingNotification {
  type: 'connected' | 'notification' | 'agent-message' | 'pong';
  userId?: string;
  payload?: unknown;
  timestamp?: string;
}

interface UseNotificationsOptions {
  userId: string;
  onNotification?: (notification: IncomingNotification) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useNotifications(options: UseNotificationsOptions) {
  const { userId, onNotification, onError, enabled = true } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = WS_MAX_RECONNECT_ATTEMPTS;

  const connect = useCallback(() => {
    if (!enabled || !userId) return;

    try {
      const wsUrl = `${WS_URL}?userId=${encodeURIComponent(userId)}`;

      console.log('[WS] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] Connected');
        reconnectAttemptsRef.current = 0;

        // Send initial registration
        ws.send(
          JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString(),
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as IncomingNotification;
          console.log('[WS] Received:', data.type, data);

          onNotification?.(data);
        } catch (error) {
          console.error('[WS] Error parsing message:', error);
        }
      };

      ws.onerror = (event) => {
        const error = new Error('WebSocket error');
        console.error('[WS] Error:', error, event);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), WS_MAX_RECONNECT_DELAY_MS);
          reconnectAttemptsRef.current++;
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          setTimeout(connect, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WS] Connection error:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [userId, onNotification, onError, enabled]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    (message: Record<string, unknown>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      } else {
        console.warn('[WS] WebSocket not open, message not sent:', message);
      }
    },
    []
  );

  const registerGoal = useCallback(
    (goal: Record<string, unknown>) => {
      sendMessage({
        type: 'register-goal',
        payload: goal,
      });
    },
    [sendMessage]
  );

  const updateGoal = useCallback(
    (goal: Record<string, unknown>) => {
      sendMessage({
        type: 'update-goal',
        payload: goal,
      });
    },
    [sendMessage]
  );

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage,
    registerGoal,
    updateGoal,
    disconnect,
  };
}
