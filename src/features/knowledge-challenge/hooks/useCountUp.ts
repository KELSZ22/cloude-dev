import { useEffect, useState } from "react";

/** Steps a score from zero to `target` so the number lands with the mascot. */
export function useCountUp(target: number, enabled: boolean, duration = 640) {
  const [ticks, setTicks] = useState(0);
  const counting = enabled && target > 0;

  useEffect(() => {
    if (!counting) return;
    const step = Math.max(24, Math.round(duration / target));
    let value = 0;
    const timer = setInterval(() => {
      value += 1;
      setTicks(value);
      if (value >= target) clearInterval(timer);
    }, step);
    return () => clearInterval(timer);
  }, [counting, target, duration]);

  return counting ? Math.min(ticks, target) : target;
}
