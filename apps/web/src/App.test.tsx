import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { SAMPLE } from "./data/sample";

afterEach(() => cleanup());

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("App", () => {
  it("renders ranked candidates with scores", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    expect(screen.getByText("tweak create user lookup")).toBeInTheDocument();
    expect(screen.getByText("0.30")).toBeInTheDocument();
    expect(
      screen.getByLabelText("evidence breakdown, total 0.30"),
    ).toBeInTheDocument();
  });

  it("shows explanation for the top candidate by default", () => {
    render(
      <Providers>
        <App />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Report" }));
    expect(screen.getByText("Contradictory evidence")).toBeInTheDocument();
    expect(screen.getByText(/message shares tokens/)).toBeInTheDocument();
  });

  it("sample matches the backend schema version", () => {
    expect(SAMPLE.schema_version).toBe("1.0");
    expect(SAMPLE.candidates.length).toBeGreaterThan(0);
  });
});
