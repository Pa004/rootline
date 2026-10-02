/** Mirrors rootline_core pydantic models (schema_version "1.0"). */

export interface EvidenceItem {
  kind: string;
  points: number;
  detail: string;
}

export interface CandidateScore {
  commit_sha: string;
  message: string;
  score: number;
  evidence: EvidenceItem[];
}

export interface Analysis {
  schema_version: string;
  candidates: CandidateScore[];
}

export interface CandidatePage {
  items: CandidateScore[];
  next_cursor: string | null;
}

export type TabId = "candidates" | "graph" | "timeline" | "treemap" | "report";
