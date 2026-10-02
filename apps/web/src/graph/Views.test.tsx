import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup } from "@testing-library/react";
import { TimelineView } from "./TimelineView";
import { TreemapView } from "./TreemapView";
import type { CandidateScore } from "../types";

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
});

const CANDIDATES: CandidateScore[] = [
  { commit_sha: "8a92f1", message: "tweak lookup", score: 0.52, evidence: [] },
  { commit_sha: "41bc77", message: "add tests", score: 0.4, evidence: [] },
];

describe("TimelineView", () => {
  it("renders the ordered causal path", () => {
    render(
      <Providers>
        <TimelineView candidates={CANDIDATES} />
      </Providers>,
    );
    expect(screen.getByLabelText("causal path from commit to failing test")).toBeInTheDocument();
    const steps = screen.getAllByText(/step \d/);
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("8a92f1")).toBeInTheDocument();
  });

  it("explains when no path exists", () => {
    render(
      <Providers>
        <TimelineView candidates={[]} />
      </Providers>,
    );
    expect(screen.getByText(/No causal path available/)).toBeInTheDocument();
  });
});

describe("TreemapView", () => {
  it("renders ranked commits with their files", () => {
    render(
      <Providers>
        <TreemapView candidates={CANDIDATES} />
      </Providers>,
    );
    expect(screen.getByLabelText("evidence treemap by commit")).toBeInTheDocument();
    expect(screen.getByText(/8a92f1/)).toBeInTheDocument();
  });

  it("explains when empty", () => {
    render(
      <Providers>
        <TreemapView candidates={[]} />
      </Providers>,
    );
    expect(screen.getByText(/No ranked commits yet/)).toBeInTheDocument();
  });
});
