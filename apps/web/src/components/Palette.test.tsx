import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Palette } from "./Palette";
import { useUi } from "../store";

afterEach(() => {
  cleanup();
  act(() => {
    useUi.setState({ paletteOpen: false, view: "home" });
  });
});

function open() {
  render(<Palette />);
  act(() => {
    useUi.setState({ paletteOpen: true });
  });
}

describe("Palette", () => {
  it("filters commands and runs on Enter", () => {
    open();
    fireEvent.change(screen.getByLabelText("command search"), {
      target: { value: "bench" },
    });
    expect(screen.getByText("Go to Benchmarks")).toBeInTheDocument();
    expect(screen.queryByText("Go to Tutorial")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText("command search"), { key: "Enter" });
    expect(useUi.getState().view).toBe("benchmarks");
    expect(useUi.getState().paletteOpen).toBe(false);
  });

  it("closes on Escape", () => {
    open();
    fireEvent.keyDown(screen.getByLabelText("command search"), { key: "Escape" });
    expect(useUi.getState().paletteOpen).toBe(false);
  });
});
