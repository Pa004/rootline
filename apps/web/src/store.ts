import { create } from "zustand";
import type { TabId } from "./types";

interface UiState {
  tab: TabId;
  selectedSha: string | null;
  setTab: (tab: TabId) => void;
  select: (sha: string | null) => void;
}

export const useUi = create<UiState>()((set) => ({
  tab: "candidates",
  selectedSha: null,
  setTab: (tab) => set({ tab }),
  select: (selectedSha) => set({ selectedSha }),
}));
