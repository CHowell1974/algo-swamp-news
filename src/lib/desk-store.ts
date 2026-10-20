import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Story } from "@/lib/scan";

type DeskState = {
  saved: Story[];
  watch: string[];
  toggleSaved: (story: Story) => void;
  toggleWatch: (symbol: string) => void;
};

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      saved: [],
      watch: [],
      toggleSaved: (story) => {
        const saved = get().saved;
        set({
          saved: saved.some((item) => item.id === story.id)
            ? saved.filter((item) => item.id !== story.id)
            : [story, ...saved].slice(0, 40),
        });
      },
      toggleWatch: (symbol) => {
        const watch = get().watch;
        set({
          watch: watch.includes(symbol) ? watch.filter((item) => item !== symbol) : [...watch, symbol].slice(0, 16),
        });
      },
    }),
    { name: "algo-swamp-desk", skipHydration: true },
  ),
);
