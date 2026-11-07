import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { getToken } from '@/shared/api/client';
import { socketBaseUrl } from '@/shared/lib/apiBase';
import { money } from '@/shared/lib/format';
import {
  ensureOrderAlertSoundUnlocked,
  playOrderAlertSound,
} from '@/shared/lib/orderAlertSound';
import { useToast } from '@/shared/ui';

const ORDER_EVENTS = [
  'order.created',
  'order.status_changed',
  'order.updated',
  'order.payment_updated',
] as const;

type LiveOrdersValue = {
  connected: boolean;
  lastEventAt: number | null;
};

const LiveOrdersContext = createContext<LiveOrdersValue>({
  connected: false,
  lastEventAt: null,
});

export function useLiveOrders() {
  return useContext(LiveOrdersContext);
}

function orderLabel(payload: unknown): {
  id?: string;
  orderNumber?: string;
  total?: number;
  customerName?: string;
} {
  if (!payload || typeof payload !== 'object') return {};
  const raw = payload as Record<string, unknown>;
  const customer = raw.customer as { name?: string } | undefined;
  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    orderNumber:
      typeof raw.orderNumber === 'string' ? raw.orderNumber : undefined,
    total: raw.total !== undefined ? Number(raw.total) : undefined,
    customerName: customer?.name,
  };
}

function showBrowserNotification(title: string, body: string, orderId?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;
  try {
    const n = new Notification(title, {
      body,
      tag: orderId ? `order-${orderId}` : 'new-order',
      renotify: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Ignore Notification constructor failures (e.g. insecure context).
  }
}

export function LiveOrdersProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const recentIds = useRef<Set<string>>(new Set());
  const toastRef = useRef(toast);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const refreshLiveData = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['orders'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
    setLastEventAt(Date.now());
  }, [qc]);

  const onCreated = useCallback(
    (payload: unknown) => {
      const { id, orderNumber, total, customerName } = orderLabel(payload);
      if (id) {
        if (recentIds.current.has(id)) {
          refreshLiveData();
          return;
        }
        recentIds.current.add(id);
        window.setTimeout(() => recentIds.current.delete(id), 15_000);
      }

      refreshLiveData();

      const numberPart = orderNumber ? `#${orderNumber}` : 'incoming';
      const who = customerName ? ` from ${customerName}` : '';
      const amount =
        total !== undefined && !Number.isNaN(total) ? ` — ${money(total)}` : '';
      const detail = `${numberPart}${who}${amount}`;
      const message = `New order ${detail}`;

      toastRef.current(message, 'info', {
        duration: 8_000,
        onClick: id ? () => navigateRef.current(`/orders/${id}`) : undefined,
      });

      playOrderAlertSound();
      showBrowserNotification('New order received', detail, id);
    },
    [refreshLiveData],
  );

  useEffect(() => {
    ensureOrderAlertSoundUnlocked();
    if ('Notification' in window && Notification.permission === 'default') {
      const ask = () => {
        void Notification.requestPermission();
        window.removeEventListener('pointerdown', ask);
      };
      window.addEventListener('pointerdown', ask, { once: true });
      return () => window.removeEventListener('pointerdown', ask);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setConnected(false);
      return;
    }

    const socket: Socket = io(socketBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onGeneric = () => refreshLiveData();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order.created', onCreated);
    socket.on('order.status_changed', onGeneric);
    socket.on('order.updated', onGeneric);
    socket.on('order.payment_updated', onGeneric);

    return () => {
      ORDER_EVENTS.forEach((e) => socket.off(e));
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
      setConnected(false);
    };
  }, [onCreated, refreshLiveData]);

  const value = useMemo(
    () => ({ connected, lastEventAt }),
    [connected, lastEventAt],
  );

  return (
    <LiveOrdersContext.Provider value={value}>
      {children}
    </LiveOrdersContext.Provider>
  );
}
