import { useEffect } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import { api } from './client';

/** Chama /status ao abrir e revalida a cada 5 s enquanto `active`. */
export function useServerStatus(active: boolean) {
  const setServerOnline = useGraphStore((s) => s.setServerOnline);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const check = () =>
      api.status().then(
        () => !cancelled && setServerOnline(true),
        () => !cancelled && setServerOnline(false),
      );
    check();
    const id = window.setInterval(check, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, setServerOnline]);
}
