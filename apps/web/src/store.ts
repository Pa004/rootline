import { create } from "zustand";
import type { TabId } from "./types";

export type Theme = "dark" | "light";
export type ViewId = "home" | "analysis" | "benchmarks" | "examples" | "tutorial";

const THEME_KEY = "rootline-theme";
const MOTION_KEY = "rootline-motion";
const VIEWS: ViewId[] = ["home", "analysis", "benchmarks", "examples", "tutorial"];

function initialTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Full motion unless the OS asks to reduce it or the user overrode it. */
export function motionOK(): boolean {
  try {
    if (localStorage.getItem(MOTION_KEY) === "reduced") return false;
    if (localStorage.getItem(MOTION_KEY) === "full") return true;
  } catch {
    /* ignore */
  }
  return (
    typeof window.matchMedia !== "function" ||
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function viewFromHash(): ViewId {
  const view = window.location.hash.replace(/^#\/?/, "") as ViewId;
  return VIEWS.includes(view) ? view : "home";
}

interface UiState {
  tab: TabId;
  view: ViewId;
  selectedSha: string | null;
  theme: Theme;
  reduceMotion: boolean;
  setTab: (tab: TabId) => void;
  setView: (view: ViewId) => void;
  select: (sha: string | null) => void;
  toggleTheme: () => void;
  toggleMotion: () => void;
}

export const useUi = create<UiState>()((set) => ({
  tab: "candidates",
  view: viewFromHash(),
  selectedSha: null,
  theme: initialTheme(),
  reduceMotion: !motionOK(),
  setTab: (tab) => set({ tab }),
  setView: (view) => {
    window.location.hash = `#/${view}`;
    set({ view });
  },
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
  toggleMotion: () =>
    set((state) => {
      const reduceMotion = !state.reduceMotion;
      try {
        localStorage.setItem(MOTION_KEY, reduceMotion ? "reduced" : "full");
      } catch {
        /* private mode: choice just won't persist */
      }
      return { reduceMotion };
    }),
}));
