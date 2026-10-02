import type { Analysis, CandidatePage } from "./types";
import type { GraphEdge, GraphNode } from "./graph/model";

export interface IndexEntry {
  id: string;
  candidate_count: number;
  top_sha: string | null;
  top_score: number | null;
}

interface GraphPageWire {
  nodes: { id: string; type?: string; outcome?: string; name?: string; path?: string }[];
  edges: { source: string; target: string; kind?: string }[];
  next_cursor: string | null;
}

const BASE_URL = import.meta.env.VITE_API_URL as string | undefined ?? "";
const GRAPH_PAGE_SIZE = 500;
const GRAPH_MAX_PAGES = 4;

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API ${response.status} on ${path}`);
  }
  return (await response.json()) as T;
}

export function fetchAnalysis(id: string): Promise<Analysis> {
  return get<Analysis>(`/api/v1/analyses/${id}`);
}

export function fetchIndex(): Promise<IndexEntry[]> {
  return get<IndexEntry[]>("/api/v1/analyses");
}

export function fetchCandidates(
  id: string,
  limit = 50,
  cursor = "0",
): Promise<CandidatePage> {
  return get<CandidatePage>(
    `/api/v1/analyses/${id}/candidates?limit=${limit}&cursor=${cursor}`,
  );
}

/** Full graph for one analysis (paginated server-side, capped client-side). */
export async function fetchGraph(
  id: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[]; truncated: boolean }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let cursor: string | null = "0";
  let pages = 0;
  let truncated = false;
  while (cursor !== null && pages < GRAPH_MAX_PAGES) {
    const batch: GraphPageWire = await get<GraphPageWire>(
      `/api/v1/analyses/${id}/graph?limit=${GRAPH_PAGE_SIZE}&cursor=${cursor}`,
    );
    for (const n of batch.nodes) {
      nodes.push({
        id: n.id,
        type: (n.type ?? "file") as GraphNode["type"],
        label: n.name || n.path || n.id,
        outcome: n.outcome,
      });
    }
    for (const e of batch.edges) {
      edges.push({
        source: e.source,
        target: e.target,
        kind: (e.kind ?? "depends") as GraphEdge["kind"],
      });
    }
    cursor = batch.next_cursor;
    pages += 1;
    if (nodes.length + edges.length > 2000) {
      truncated = true;
      break;
    }
  }
  if (cursor !== null) truncated = true;
  return { nodes, edges, truncated };
}

export function apiConfigured(): boolean {
  return BASE_URL.length > 0;
}
