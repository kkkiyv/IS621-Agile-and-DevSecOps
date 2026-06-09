import { useEffect, useState } from "react";

const TICK_MS = 60_000;

/** Re-evaluates overdue status as the system clock advances (AC5). */
export function useNow(tickMs = TICK_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return now;
}
