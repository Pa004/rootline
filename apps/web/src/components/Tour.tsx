import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    title: "KPI cards",
    text: "Analyses count, top evidence score, corpus MRR and languages at a glance.",
  },
  {
    title: "Recent analyses",
    text: "Every run lands here. Select one to open it in the Analysis view.",
  },
  {
    title: "Evidence weights",
    text: "How each signal contributes to the score. Tune them in rootline.toml.",
  },
  {
    title: "Quickstart",
    text: "Jump to the tutorial or browse the worked examples.",
  },
];

export function Tour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const total = STEPS.length;
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const current = STEPS[step];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Guided tour, step ${step + 1} of ${total}: ${current.title}`}
      ref={dialogRef}
      tabIndex={-1}
      className="mt-4 rounded border border-(--border) bg-(--surface) p-4"
    >
      <p className="text-sm text-(--muted)">
        Step {step + 1} of {total}
      </p>
      <h3 className="font-semibold">{current.title}</h3>
      <p className="mt-1 text-sm">{current.text}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setStep(Math.max(step - 1, 0))}
          disabled={step === 0}
          className="rounded bg-(--surface-2) px-3 py-1 text-sm disabled:opacity-40"
        >
          Back
        </button>
        {step < total - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="rounded bg-(--text) px-3 py-1 text-sm text-(--bg)"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onClose}
            className="rounded bg-(--text) px-3 py-1 text-sm text-(--bg)"
          >
            Finish
          </button>
        )}
        <button onClick={onClose} className="rounded px-3 py-1 text-sm text-(--muted)">
          Close
        </button>
      </div>
    </div>
  );
}
