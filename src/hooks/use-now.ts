import { useEffect, useState } from "react";

const currentDate = new Date();

const millisecondsUntilNextLocalDay = (now: Date): number => {
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, 0);
  return Math.max(1, nextDay.getTime() - now.getTime());
};

export const useNow = (): Date => {
  const [now, setNow] = useState(() => currentDate);

  useEffect(() => {
    const refresh = () => setNow(currentDate);
    const timer = window.setTimeout(
      refresh,
      millisecondsUntilNextLocalDay(now)
    );

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [now]);

  return now;
};
