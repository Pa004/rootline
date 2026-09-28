import { useEffect, useState } from "react";
import { useUi } from "./store";

/** Count-up to target formatted with toFixed; jumps instantly when reduced. */
export function useCountUp(target: number, decimals = 2, durationMs = 900): string {
  const reduceMotion = useUi((s) => s.reduceMotion);
  const [value, setValue] = useState(reduceMotion ? target : 0);
  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setValue(target * progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, decimals, durationMs, reduceMotion]);
  return value.toFixed(decimals);
}
