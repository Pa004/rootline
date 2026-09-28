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
  useUi.setState({ tab: "candidates", view: "home", selectedSha: null, theme: "dark" });
  document.documentElement.dataset.theme = "dark";
  window.location.hash = "";
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
    expect(screen.getByText("Analyze your first repo")).toBeInTheDocument();
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
    expect(screen.getByText("Analyze your first repo")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/tutorial");
  });

  it("sample matches the backend schema version", () => {
    expect(SAMPLE.schema_version).toBe("1.0");
    expect(SAMPLE.candidates.length).toBeGreaterThan(0);
  });

  it("toggles light mode and persists the choice", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "switch to light mode" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("button", { name: "switch to dark mode" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "switch to dark mode" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
