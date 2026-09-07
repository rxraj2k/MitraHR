import { useEffect, useRef } from 'react';

// Calls `callback` on an interval, and immediately again whenever the tab
// regains focus/visibility. This app has no live push connection, so a
// change made in one session (an employee submitting a request, an admin
// approving one) reaches another open session this way rather than
// needing a manual page reload.
export function useAutoRefresh(callback: () => void, intervalMs = 20000) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    const tick = () => savedCallback.current();
    const interval = setInterval(tick, intervalMs);
    function onVisible() {
      if (document.visibilityState === 'visible') tick();
    }
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);
}
