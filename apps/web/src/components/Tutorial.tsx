const STEPS = [
  {
    title: "1. Run your tests to JUnit",
    command: "pytest --junitxml=results.xml",
    note: "Jest, Vitest and pytest all emit JUnit XML.",
  },
  {
    title: "2. Analyze the repo",
    command: "rootline analyze ./repo --test-results results.xml --baseline main --output analysis.json",
    note: "One command. Local only, no accounts.",
  },
  {
    title: "3. Inspect and verify",
    command: "rootline candidates analysis.json && rootline verify <sha> --test <failing-test>",
    note: "Verify reverts the candidate in a throwaway worktree.",
  },
];

export function Tutorial() {
  return (
    <div>
      <h2 className="text-lg font-semibold">Analyze your first repo</h2>
      <ol className="mt-4 space-y-4">
        {STEPS.map((step, i) => (
          <li key={i} className="rounded border border-(--border) bg-(--surface) p-4">
            <h3 className="font-semibold">{step.title}</h3>
            <pre className="mt-2 overflow-x-auto rounded bg-(--surface-2) p-2 font-mono text-sm">
              {step.command}
            </pre>
            <p className="mt-1 text-sm text-(--muted)">{step.note}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
