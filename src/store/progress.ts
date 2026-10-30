import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProgressSnapshot, Suggestion, SuggestionStatus } from "@/types";
import { generateId, now } from "@/lib/utils";

interface ProgressStore {
  snapshots: ProgressSnapshot[];
  suggestions: Suggestion[];

  // Snapshots
  addSnapshot: (snapshot: Omit<ProgressSnapshot, "id" | "calculatedAt">) => ProgressSnapshot;
  getLatestSnapshot: (subjectId: string) => ProgressSnapshot | undefined;
  getSnapshots: (subjectId: string) => ProgressSnapshot[];

  // Suggestions
  addSuggestion: (suggestion: Omit<Suggestion, "id" | "createdAt">) => Suggestion;
  updateSuggestionStatus: (id: string, status: SuggestionStatus) => void;
  getPendingSuggestions: () => Suggestion[];
  getAllSuggestions: () => Suggestion[];
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      snapshots: [],
      suggestions: [],

      addSnapshot: (data) => {
        const snap: ProgressSnapshot = {
          ...data,
          id: generateId(),
          calculatedAt: now(),
        };
        set((s) => ({ snapshots: [...s.snapshots, snap] }));
        return snap;
      },

      getLatestSnapshot: (subjectId) => {
        const snaps = get()
          .snapshots.filter((s) => s.subjectId === subjectId)
          .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());
        return snaps[0];
      },

      getSnapshots: (subjectId) =>
        get()
          .snapshots.filter((s) => s.subjectId === subjectId)
          .sort((a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime()),

      addSuggestion: (data) => {
        const sug: Suggestion = { ...data, id: generateId(), createdAt: now() };
        set((s) => ({ suggestions: [...s.suggestions, sug] }));
        return sug;
      },

      updateSuggestionStatus: (id, status) =>
        set((s) => ({
          suggestions: s.suggestions.map((sug) =>
            sug.id === id ? { ...sug, status } : sug,
          ),
        })),

      getPendingSuggestions: () =>
        get().suggestions.filter((s) => s.status === "pending"),

      getAllSuggestions: () =>
        [...get().suggestions].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    }),
    { name: "ast-progress" },
  ),
);
