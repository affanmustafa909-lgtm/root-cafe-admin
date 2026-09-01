import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getToken } from '@/shared/api/client';
import { socketBaseUrl } from '@/shared/lib/apiBase';

const EVENTS = [
  'order.created',
  'order.status_changed',
  'order.updated',
  'order.payment_updated',
] as const;

export function useSocket(onEvent?: () => void) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket: Socket = io(socketBaseUrl(), { auth: { token } });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const handler = () => onEvent?.();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    EVENTS.forEach((e) => socket.on(e, handler));

    return () => {
      EVENTS.forEach((e) => socket.off(e, handler));
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [onEvent]);

  return { connected };
}
