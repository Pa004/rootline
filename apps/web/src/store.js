import { create } from "zustand";
export const useUi = create()((set) => ({
    tab: "candidates",
    selectedSha: null,
    setTab: (tab) => set({ tab }),
    select: (selectedSha) => set({ selectedSha }),
}));
