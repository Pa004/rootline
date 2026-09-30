import { useQuery } from "@tanstack/react-query";
import { apiConfigured, fetchAnalysis } from "./api";
import { SAMPLE } from "./data/sample";
import type { Analysis } from "./types";

const ANALYSIS_ID = (import.meta.env.VITE_ANALYSIS_ID as string | undefined) ?? "";

export function useAnalysis(): { analysis: Analysis; live: boolean } {
  const enabled = apiConfigured() && ANALYSIS_ID.length > 0;
  const query = useQuery({
    queryKey: ["analysis", ANALYSIS_ID],
    queryFn: () => fetchAnalysis(ANALYSIS_ID),
    enabled,
    retry: false,
    refetchInterval: 30000,
  });
  if (!enabled || query.isError || !query.data) {
    return { analysis: SAMPLE, live: false };
  }
  return { analysis: query.data, live: query.isSuccess };
}
