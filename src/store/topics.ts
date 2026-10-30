import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Topic } from "@/types";
import { generateId, now } from "@/lib/utils";

interface TopicStore {
  topics: Topic[];
  addTopic: (subjectId: string, title: string, parentTopicId?: string | null) => Topic;
  updateTopic: (id: string, updates: Partial<Pick<Topic, "title" | "covered">>) => void;
  deleteTopic: (id: string) => void;
  deleteBySubject: (subjectId: string) => void;
  toggleCovered: (id: string) => void;
  reorderTopics: (ids: string[]) => void;
  getTopicsBySubject: (subjectId: string) => Topic[];
  getChildTopics: (parentId: string) => Topic[];
  getCoveragePercent: (subjectId: string) => number;
}

export const useTopicStore = create<TopicStore>()(
  persist(
    (set, get) => ({
      topics: [],

      addTopic: (subjectId, title, parentTopicId = null) => {
        const siblings = parentTopicId
          ? get().getChildTopics(parentTopicId)
          : get().getTopicsBySubject(subjectId).filter((t) => !t.parentTopicId);
        const topic: Topic = {
          id: generateId(),
          subjectId,
          parentTopicId,
          title,
          covered: false,
          sortOrder: siblings.length,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ topics: [...s.topics, topic] }));
        return topic;
      },

      updateTopic: (id, updates) =>
        set((s) => ({
          topics: s.topics.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: now() } : t,
          ),
        })),

      deleteTopic: (id) => {
        // Also delete children
        const children = get().getChildTopics(id);
        const childIds = children.map((c) => c.id);
        set((s) => ({
          topics: s.topics.filter((t) => t.id !== id && !childIds.includes(t.id)),
        }));
      },

      deleteBySubject: (subjectId) =>
        set((s) => ({
          topics: s.topics.filter((t) => t.subjectId !== subjectId),
        })),

      toggleCovered: (id) =>
        set((s) => ({
          topics: s.topics.map((t) =>
            t.id === id ? { ...t, covered: !t.covered, updatedAt: now() } : t,
          ),
        })),

      reorderTopics: (ids) =>
        set((s) => ({
          topics: s.topics.map((t) => {
            const idx = ids.indexOf(t.id);
            return idx >= 0 ? { ...t, sortOrder: idx } : t;
          }),
        })),

      getTopicsBySubject: (subjectId) =>
        get()
          .topics.filter((t) => t.subjectId === subjectId)
          .sort((a, b) => a.sortOrder - b.sortOrder),

      getChildTopics: (parentId) =>
        get()
          .topics.filter((t) => t.parentTopicId === parentId)
          .sort((a, b) => a.sortOrder - b.sortOrder),

      getCoveragePercent: (subjectId) => {
        const subTopics = get().getTopicsBySubject(subjectId);
        if (subTopics.length === 0) return 0;
        const covered = subTopics.filter((t) => t.covered).length;
        return Math.round((covered / subTopics.length) * 100);
      },
    }),
    { name: "ast-topics" },
  ),
);
