import { useEffect, useState } from "react";
import { useUi } from "../store";

const RADIUS = 52;
const CIRCUMFERENCE = Math.PI * RADIUS;

/** Data-reactive arc color: amber below 0.33, theme accent above. */
export function scoreHue(score: number): "low" | "high" {
  return score < 0.33 ? "low" : "high";
}

/** Evidence-strength gauge (SVG arc). Sweeps unless motion is reduced. */
export function ScoreGauge({ score, label }: { score: number; label: string }) {
  const reduceMotion = useUi((s) => s.reduceMotion);
  const [swept, setSwept] = useState(reduceMotion);
  const clamped = Math.min(Math.max(score, 0), 1);
  useEffect(() => {
    if (reduceMotion) {
      setSwept(true);
      return;
    }
    setSwept(false);
    const first = requestAnimationFrame(() =>
      requestAnimationFrame(() => setSwept(true)),
    );
    return () => cancelAnimationFrame(first);
  }, [reduceMotion, score]);
  return (
    <div
      role="img"
      aria-label={`${label}: evidence strength ${score.toFixed(2)} out of 1`}
      className="w-36"
    >
      <svg viewBox="0 0 120 70" className="w-full">
        <path
          d="M 8 60 A 52 52 0 0 1 112 60"
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 8 60 A 52 52 0 0 1 112 60"
          fill="none"
          stroke={scoreHue(score) === "low" ? "#d97706" : "var(--accent)"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE.toFixed(1)}
          strokeDashoffset={(CIRCUMFERENCE * (swept ? 1 - clamped : 1)).toFixed(1)}
          style={reduceMotion ? undefined : { transition: "stroke-dashoffset 900ms ease-out" }}
        />
      </svg>
      <p className="-mt-6 text-center font-mono text-2xl">{score.toFixed(2)}</p>
      <p className="mt-1 text-center font-mono text-[11px] uppercase tracking-widest text-(--muted)">
        {label}
      </p>
    </div>
  );
}
