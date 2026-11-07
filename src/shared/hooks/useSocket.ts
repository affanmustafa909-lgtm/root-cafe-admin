import { useEffect, useRef } from 'react';
import { useLiveOrders } from './LiveOrdersProvider';

/**
 * Back-compat helper. The live socket (and new-order alerts) live in
 * LiveOrdersProvider so every admin page stays connected.
 */
export function useSocket(onEvent?: () => void) {
  const { connected, lastEventAt } = useLiveOrders();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (lastEventAt == null) return;
    onEventRef.current?.();
  }, [lastEventAt]);

  return { connected };
}
