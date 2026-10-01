import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGraph } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

function page(nodes: object[], edges: object[], next: string | null) {
  return { nodes, edges, next_cursor: next };
}

describe("fetchGraph", () => {
  it("maps wire nodes/edges and follows cursors", async () => {
    const first = page(
      [{ id: "file:a", type: "file", path: "a.py" }],
      [{ source: "file:a", target: "file:b", kind: "depends" }],
      "1",
    );
    const second = page(
      [{ id: "test:t", type: "test", outcome: "failed", name: "t" }],
      [],
      null,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => first })
        .mockResolvedValueOnce({ ok: true, json: async () => second }),
    );
    const graph = await fetchGraph("demo");
    expect(graph.truncated).toBe(false);
    expect(graph.nodes).toEqual([
      { id: "file:a", type: "file", label: "a.py", outcome: undefined },
      { id: "test:t", type: "test", label: "t", outcome: "failed" },
    ]);
    expect(graph.edges).toEqual([{ source: "file:a", target: "file:b", kind: "depends" }]);
    expect(
      (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls,
    ).toHaveLength(2);
  });

  it("marks truncated when pages run out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => page([], [], "9"),
      }),
    );
    const graph = await fetchGraph("demo");
    expect(graph.truncated).toBe(true);
  });

  it("throws on HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchGraph("missing")).rejects.toThrow("API 404");
  });
});
