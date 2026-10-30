import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlannerTask, TaskStatus, TaskPriority, TaskType } from "@/types";
import { generateId, now } from "@/lib/utils";
import { dayKey, moveToDay } from "@/lib/calendar";

interface TaskStore {
  tasks: PlannerTask[];
  addTask: (task: Omit<PlannerTask, "id" | "createdAt" | "updatedAt">) => PlannerTask;
  updateTask: (id: string, updates: Partial<PlannerTask>) => void;
  deleteTask: (id: string) => void;
  deleteBySubject: (subjectId: string) => void;
  toggleDone: (id: string) => void;
  moveToDate: (id: string, newDate: string) => void;
  getTasksByDate: (date: string) => PlannerTask[];
  getTasksBySubject: (subjectId: string) => PlannerTask[];
  getTasksByDateRange: (start: string, end: string) => PlannerTask[];
  getUpcoming: (days?: number) => PlannerTask[];
  getOverdue: () => PlannerTask[];
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (taskData) => {
        const task: PlannerTask = {
          ...taskData,
          id: generateId(),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return task;
      },

      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: now() } : t,
          ),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      deleteBySubject: (subjectId) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.subjectId !== subjectId) })),

      toggleDone: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: (t.status === "done" ? "todo" : "done") as TaskStatus,
                  updatedAt: now(),
                }
              : t,
          ),
        })),

      // newDate is either a local day "YYYY-MM-DD" or a full ISO time (its local day is used).
      // The task keeps its local time of day. Reminders follow automatically (ReminderEngine).
      moveToDate: (id, newDate) =>
        set((s) => {
          const key = /^\d{4}-\d{2}-\d{2}$/.test(newDate) ? newDate : dayKey(new Date(newDate));
          return {
            tasks: s.tasks.map((t) => {
              if (t.id !== id) return t;
              const next = moveToDay(t.dueAt, key);
              return next ? { ...t, dueAt: next, updatedAt: now() } : t;
            }),
          };
        }),

      getTasksByDate: (date) => {
        const d = new Date(date);
        return get().tasks.filter((t) => {
          const td = new Date(t.dueAt);
          return (
            td.getDate() === d.getDate() &&
            td.getMonth() === d.getMonth() &&
            td.getFullYear() === d.getFullYear()
          );
        });
      },

      getTasksBySubject: (subjectId) =>
        get().tasks.filter((t) => t.subjectId === subjectId),

      getTasksByDateRange: (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        return get().tasks.filter((t) => {
          const d = new Date(t.dueAt);
          return d >= s && d <= e;
        });
      },

      getUpcoming: (days = 7) => {
        const today = new Date();
        const future = new Date();
        future.setDate(today.getDate() + days);
        return get()
          .tasks.filter((t) => {
            const d = new Date(t.dueAt);
            return d >= today && d <= future && t.status !== "done";
          })
          .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
      },

      getOverdue: () => {
        const today = new Date();
        return get().tasks.filter(
          (t) => new Date(t.dueAt) < today && t.status !== "done",
        );
      },
    }),
    { name: "ast-tasks" },
  ),
);
