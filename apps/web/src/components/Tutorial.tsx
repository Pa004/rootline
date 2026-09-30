import { useState } from "react";

const STEPS = [
  {
    title: "1. Run your tests to JUnit",
    command: "pytest --junitxml=results.xml",
    note: "Jest, Vitest and pytest all emit JUnit XML.",
  },
  {
    title: "2. Analyze the repo",
    command:
      "rootline analyze ./repo --test-results results.xml --baseline main --output analysis.json",
    note: "One command. Local only, no accounts.",
  },
  {
    title: "3. Inspect and verify",
    command: "rootline candidates analysis.json && rootline verify <sha> --test <failing-test>",
    note: "Verify reverts the candidate in a throwaway worktree.",
  },
];

async function copyCommand(command: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(command);
    return true;
  } catch {
    return false;
  }
}

export function Tutorial() {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const total = STEPS.length;
  const current = STEPS[step];
  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-display font-bold">Analyze your first repo</h2>
      <p className="mt-1 rounded border border-(--border) bg-(--surface) p-3 text-sm">
        You need: <strong>Python 3.13+</strong>, <strong>git</strong>, and a{" "}
        <strong>JUnit XML</strong> report from your test run. No accounts, no
        servers, no credit card.
      </p>
      <p className="text-sm text-(--muted)">
        Step {step + 1} of {total}
      </p>
      <div className="mt-4 rounded border border-(--border) bg-(--surface) p-4">
        <h3 className="font-display font-bold">{current.title}</h3>
        <pre
          tabIndex={0}
          aria-label={`command: ${current.command}`}
          className="mt-2 overflow-x-auto rounded bg-(--surface-2) p-2 font-mono text-sm"
        >
          {current.command}
        </pre>
        <p className="mt-1 text-sm text-(--muted)">{current.note}</p>
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
            <span className="px-1 py-1 text-sm text-(--muted)">Done — run it locally.</span>
          )}
          <button
            onClick={() =>
              copyCommand(current.command).then((ok) => {
                setCopied(ok);
                if (ok) window.setTimeout(() => setCopied(false), 1500);
              })
            }
            className="rounded px-3 py-1 text-sm text-(--muted)"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <button
        onClick={() => setStep(0)}
        className="mt-2 text-sm text-(--muted) hover:underline"
      >
        Skip to start
      </button>
    </div>
  );
}
