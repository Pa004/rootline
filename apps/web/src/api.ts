import type { Analysis, CandidatePage } from "./types";

export interface IndexEntry {
  id: string;
  candidate_count: number;
  top_sha: string | null;
  top_score: number | null;
}

const BASE_URL = import.meta.env.VITE_API_URL as string | undefined ?? "";

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

export function apiConfigured(): boolean {
  return BASE_URL.length > 0;
}
