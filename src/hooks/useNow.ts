import { useEffect, useState } from 'react';

/**
 * Reloj para pantallas con tiempo en vivo. Solo avanza mientras `active` es
 * true, para no repintar cada segundo pantallas que no lo necesitan.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    // Primer tic inmediato: al activarse, la hora guardada puede ser vieja.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, intervalMs]);
  return now;
}
