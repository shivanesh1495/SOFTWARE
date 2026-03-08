import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../services/api.config';

// ─── Singleton socket (shared across all hooks) ─────────────────────────
let sharedSocket: Socket | null = null;
let refCount = 0;

function getSharedSocket(): Socket | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    if (!sharedSocket || sharedSocket.disconnected) {
        sharedSocket = io(API_CONFIG.MAIN_BACKEND_URL.replace('/api', ''), {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            autoConnect: true,
        });
    }
    refCount++;
    return sharedSocket;
}

function releaseSharedSocket() {
    refCount--;
    if (refCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        refCount = 0;
    }
}

// ─── Hook ───────────────────────────────────────────────────────────────

/**
 * Listen for one or more Socket.IO events and call `onEvent` when any fires.
 * Typical usage:
 *
 *   useRealtimeRefresh(['booking:updated', 'menu:updated'], () => {
 *       refetchData();
 *   });
 *
 * The hook manages the socket lifecycle automatically (connect on mount,
 * disconnect on unmount, shared across multiple hook instances).
 */
export const useRealtimeRefresh = (
    events: string[],
    onEvent: (eventName: string, data: unknown) => void,
) => {
    const callbackRef = useRef(onEvent);

    useEffect(() => {
        callbackRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        const socket = getSharedSocket();
        if (!socket) return;

        const handlers: Record<string, (data: unknown) => void> = {};

        events.forEach((evt) => {
            const handler = (data: unknown) => {
                callbackRef.current(evt, data);
            };
            handlers[evt] = handler;
            socket.on(evt, handler);
        });

        return () => {
            events.forEach((evt) => {
                socket.off(evt, handlers[evt]);
            });
            releaseSharedSocket();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events.join(',')]);
};

export default useRealtimeRefresh;
