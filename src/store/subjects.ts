import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Subject, SubjectColor } from "@/types";
import { generateId, now } from "@/lib/utils";
import { useTopicStore } from "./topics";
import { useTaskStore } from "./tasks";
import { useNoteStore } from "./notes";
import { useResourceStore } from "./resources";
import { useQuizStore } from "./quizzes";
import { useProgressStore } from "./progress";
import { useChatStore } from "./chat";

const COLORS: SubjectColor[] = ["yellow", "mint", "pink", "sky", "violet", "orange"];

interface SubjectStore {
  subjects: Subject[];
  addSubject: (title: string, color?: SubjectColor, examDate?: string) => Subject;
  updateSubject: (id: string, updates: Partial<Pick<Subject, "title" | "color" | "examDate">>) => void;
  deleteSubject: (id: string) => void;
  reorderSubjects: (ids: string[]) => void;
  getSubject: (id: string) => Subject | undefined;
  nextColor: () => SubjectColor;
}

export const useSubjectStore = create<SubjectStore>()(
  persist(
    (set, get) => ({
      subjects: [],

      addSubject: (title, color, examDate) => {
        const sub: Subject = {
          id: generateId(),
          title,
          color: color ?? get().nextColor(),
          examDate,
          sortOrder: get().subjects.length,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ subjects: [...s.subjects, sub] }));
        return sub;
      },

      updateSubject: (id, updates) =>
        set((s) => ({
          subjects: s.subjects.map((sub) =>
            sub.id === id ? { ...sub, ...updates, updatedAt: now() } : sub,
          ),
        })),

      deleteSubject: (id) => {
        useTopicStore.getState().deleteBySubject(id);
        useTaskStore.getState().disconnectBySubject(id);
        useNoteStore.getState().deleteBySubject(id);
        useResourceStore.getState().deleteBySubject(id);
        useQuizStore.getState().deleteBySubject(id);
        useProgressStore.getState().deleteBySubject(id);
        useChatStore.getState().deleteBySubject(id);
        set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) }));
      },

      reorderSubjects: (ids) =>
        set((s) => ({
          subjects: ids
            .map((id, i) => {
              const sub = s.subjects.find((x) => x.id === id);
              return sub ? { ...sub, sortOrder: i, updatedAt: now() } : null;
            })
            .filter(Boolean) as Subject[],
        })),

      getSubject: (id) => get().subjects.find((s) => s.id === id),

      nextColor: () => {
        const used = get().subjects.map((s) => s.color);
        return COLORS.find((c) => !used.includes(c)) ?? COLORS[get().subjects.length % COLORS.length];
      },
    }),
    { name: "ast-subjects" },
  ),
);
