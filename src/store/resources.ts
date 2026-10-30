import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Resource, ResourceKind } from "@/types";
import { generateId, now } from "@/lib/utils";

interface ResourceStore {
  resources: Resource[];
  addResource: (title: string, kind: ResourceKind, content: string, subjectId?: string | null) => Resource;
  updateResource: (id: string, updates: Partial<Pick<Resource, "title" | "content" | "subjectId">>) => void;
  deleteResource: (id: string) => void;
  deleteBySubject: (subjectId: string) => void;
  getAll: () => Resource[];
  getBySubject: (subjectId: string) => Resource[];
  searchResources: (query: string) => Resource[];
  getResource: (id: string) => Resource | undefined;
}

export const useResourceStore = create<ResourceStore>()(
  persist(
    (set, get) => ({
      resources: [],

      addResource: (title, kind, content, subjectId = null) => {
        const r: Resource = {
          id: generateId(),
          title,
          kind,
          content,
          subjectId,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ resources: [...s.resources, r] }));
        return r;
      },

      updateResource: (id, updates) =>
        set((s) => ({
          resources: s.resources.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: now() } : r,
          ),
        })),

      deleteResource: (id) =>
        set((s) => ({ resources: s.resources.filter((r) => r.id !== id) })),

      deleteBySubject: (subjectId) =>
        set((s) => ({ resources: s.resources.filter((r) => r.subjectId !== subjectId) })),

      getAll: () =>
        [...get().resources].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),

      getBySubject: (subjectId) =>
        get()
          .resources.filter((r) => r.subjectId === subjectId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),

      searchResources: (query) => {
        const q = query.toLowerCase();
        return get().resources.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.content.toLowerCase().includes(q),
        );
      },

      getResource: (id) => get().resources.find((r) => r.id === id),
    }),
    { name: "ast-resources" },
  ),
);
