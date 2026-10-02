import { describe, expect, it } from "vitest";
import { layoutFlow } from "./flowLayout";
import { DEMO_EDGES, DEMO_NODES } from "./model";

const centerX = (p: { x: number; width: number }) => p.x + p.width / 2;
const centerY = (p: { y: number; height: number }) => p.y + p.height / 2;

describe("layoutFlow", () => {
  it("positions every node exactly once with positive sizes", () => {
    const positions = layoutFlow(DEMO_NODES, DEMO_EDGES, "LR");
    expect(positions.size).toBe(DEMO_NODES.length);
    for (const p of positions.values()) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
    }
  });

  it("is deterministic across runs", () => {
    const a = layoutFlow(DEMO_NODES, DEMO_EDGES, "LR");
    const b = layoutFlow(DEMO_NODES, DEMO_EDGES, "LR");
    for (const n of DEMO_NODES) {
      expect(b.get(n.id)).toEqual(a.get(n.id));
    }
  });

  it("orders edge sources before targets along the rank axis", () => {
    const lr = layoutFlow(DEMO_NODES, DEMO_EDGES, "LR");
    for (const e of DEMO_EDGES) {
      expect(centerX(lr.get(e.source)!)).toBeLessThan(centerX(lr.get(e.target)!));
    }
    const tb = layoutFlow(DEMO_NODES, DEMO_EDGES, "TB");
    for (const e of DEMO_EDGES) {
      expect(centerY(tb.get(e.source)!)).toBeLessThan(centerY(tb.get(e.target)!));
    }
  });

  it("changes orientation with direction", () => {
    const lr = layoutFlow(DEMO_NODES, DEMO_EDGES, "LR");
    const tb = layoutFlow(DEMO_NODES, DEMO_EDGES, "TB");
    const same = DEMO_NODES.filter(
      (n) => lr.get(n.id)!.x === tb.get(n.id)!.x && lr.get(n.id)!.y === tb.get(n.id)!.y,
    );
    expect(same.length).toBeLessThan(DEMO_NODES.length);
  });
});
