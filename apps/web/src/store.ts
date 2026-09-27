import { create } from "zustand";
import type { TabId } from "./types";

export type Theme = "dark" | "light";

const THEME_KEY = "rootline-theme";

function initialTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

interface UiState {
  tab: TabId;
  selectedSha: string | null;
  theme: Theme;
  setTab: (tab: TabId) => void;
  select: (sha: string | null) => void;
  toggleTheme: () => void;
}

export const useUi = create<UiState>()((set) => ({
  tab: "candidates",
  selectedSha: null,
  theme: initialTheme(),
  setTab: (tab) => set({ tab }),
  select: (selectedSha) => set({ selectedSha }),
  toggleTheme: () =>
    set((state) => {
      const theme: Theme = state.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        /* private mode: theme just won't persist */
      }
      return { theme };
    }),
}));
