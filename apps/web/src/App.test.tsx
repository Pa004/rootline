import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { SAMPLE } from "./data/sample";

afterEach(() => cleanup());

describe("App", () => {
  it("renders ranked candidates with scores", () => {
    render(<App />);
    expect(screen.getByText("tweak create user lookup")).toBeInTheDocument();
    expect(screen.getByText("0.30")).toBeInTheDocument();
    expect(
      screen.getByLabelText("evidence breakdown, total 0.30"),
    ).toBeInTheDocument();
  });

  it("shows explanation for the top candidate by default", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Report" }));
    expect(screen.getByText("Contradictory evidence")).toBeInTheDocument();
    expect(screen.getByText(/message shares tokens/)).toBeInTheDocument();
  });

  it("sample matches the backend schema version", () => {
    expect(SAMPLE.schema_version).toBe("1.0");
    expect(SAMPLE.candidates.length).toBeGreaterThan(0);
  });
});
