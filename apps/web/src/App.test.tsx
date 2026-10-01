import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { SAMPLE } from "./data/sample";
import { useUi } from "./store";

afterEach(() => {
  cleanup();
  localStorage.removeItem("rootline-theme");
  localStorage.removeItem("rootline-motion");
  useUi.setState({ tab: "candidates", view: "home", selectedSha: null, theme: "light", reduceMotion: false });
  document.documentElement.dataset.theme = "light";
});

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function goAnalysis() {
  fireEvent.click(screen.getByRole("button", { name: "Analysis" }));
}

describe("App", () => {
  it("lands on the dashboard with KPIs", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    expect(screen.getByText("Corpus MRR")).toBeInTheDocument();
    expect(screen.getByText("Start guided tour")).toBeInTheDocument();
    expect(screen.getByText("How it works")).toBeInTheDocument();
  });

  it("spotlights a corpus case with its verdict", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    expect(screen.getByText("Case spotlight")).toBeInTheDocument();
    fireEvent.click(screen.getByText("See the evidence trail"));
    expect(screen.getByText("The two-hop culprit")).toBeInTheDocument();
  });

  it("shows the verdict hero with gauge and quickstart", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    expect(screen.getByText("Most probable cause")).toBeInTheDocument();
    expect(screen.getByLabelText(/evidence strength 0\.30/)).toBeInTheDocument();
    expect(screen.getByText("Also suspected")).toBeInTheDocument();
  });

  it("renders ranked candidates with scores", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    goAnalysis();
    expect(screen.getByText("tweak create user lookup")).toBeInTheDocument();
    expect(screen.getByText("0.30")).toBeInTheDocument();
    expect(screen.getByLabelText("evidence breakdown, total 0.30")).toBeInTheDocument();
  });

  it("shows explanation for the top candidate by default", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    goAnalysis();
    fireEvent.click(screen.getByRole("button", { name: "Report" }));
    expect(screen.getByText("Contradictory evidence")).toBeInTheDocument();
    expect(screen.getByText(/message shares tokens/)).toBeInTheDocument();
  });

  it("navigates to benchmarks, examples and tutorial", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Benchmarks" }));
    expect(screen.getByText(/Top-1 1.00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Examples" }));
    expect(screen.getByText("The two-hop culprit")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tutorial" }));
    expect(screen.getByText("1. Run your tests to JUnit")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/tutorial");
  });

  it("sample matches the backend schema version", () => {
    expect(SAMPLE.schema_version).toBe("1.0");
    expect(SAMPLE.candidates.length).toBeGreaterThan(0);
  });

  it("toggles theme and persists the choice", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    expect(document.documentElement.dataset.theme).toBe("light");
    fireEvent.click(screen.getByRole("button", { name: "switch to dark mode" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: "switch to light mode" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "switch to light mode" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("reduce motion shows final values instantly", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "reduce motion" }));
    expect(screen.getByRole("button", { name: "enable motion" })).toBeInTheDocument();
    expect(localStorage.getItem("rootline-motion")).toBe("reduced");
    expect(screen.getByText("1.00")).toBeInTheDocument();
  });

  it("guided tour walks four steps and closes", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start guided tour" }));
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText(/Step \d of 4/)).not.toBeInTheDocument();
  });

  it("tutorial wizard advances and examples select trails", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Tutorial" }));
    expect(screen.getByText("1. Run your tests to JUnit")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("2. Analyze the repo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Examples" }));
    fireEvent.click(screen.getByText("The two-hop culprit"));
    expect(screen.getByText(/Ranked #1 on structural evidence/)).toBeInTheDocument();
  });
});
