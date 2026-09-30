import { useQuery } from "@tanstack/react-query";
import { apiConfigured, fetchIndex, type IndexEntry } from "./api";

export function useIndex(): IndexEntry[] {
  const enabled = apiConfigured();
  const query = useQuery({
    queryKey: ["analyses-index"],
    queryFn: fetchIndex,
    enabled,
    retry: false,
    refetchInterval: 30000,
  });
  if (!enabled || query.isError || !query.data) {
    return [
      { id: "demo", candidate_count: 2, top_sha: "8a92f1c4d2e8", top_score: 0.3 },
    ];
  }
  return query.data;
}
