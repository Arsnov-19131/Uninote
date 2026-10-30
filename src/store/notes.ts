import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Note, NoteFormat } from "@/types";
import { generateId, now } from "@/lib/utils";

interface NoteStore {
  notes: Note[];
  addNote: (title: string, body: string, subjectId?: string | null, format?: NoteFormat, tags?: string[]) => Note;
  updateNote: (id: string, updates: Partial<Pick<Note, "title" | "body" | "subjectId" | "tags" | "format">>) => void;
  softDelete: (id: string) => void;
  restore: (id: string) => void;
  permanentDelete: (id: string) => void;
  emptyTrash: () => void;
  deleteBySubject: (subjectId: string) => void;
  getActiveNotes: () => Note[];
  getTrash: () => Note[];
  getNotesBySubject: (subjectId: string) => Note[];
  searchNotes: (query: string) => Note[];
  getNote: (id: string) => Note | undefined;
}

export const useNoteStore = create<NoteStore>()(
  persist(
    (set, get) => ({
      notes: [],

      addNote: (title, body, subjectId = null, format = "markdown", tags = []) => {
        const note: Note = {
          id: generateId(),
          title,
          body,
          format,
          subjectId,
          tags,
          deletedAt: null,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ notes: [...s.notes, note] }));
        return note;
      },

      updateNote: (id, updates) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...updates, updatedAt: now() } : n,
          ),
        })),

      softDelete: (id) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, deletedAt: now() } : n,
          ),
        })),

      restore: (id) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, deletedAt: null } : n,
          ),
        })),

      permanentDelete: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      emptyTrash: () =>
        set((s) => ({ notes: s.notes.filter((n) => !n.deletedAt) })),

      deleteBySubject: (subjectId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.subjectId === subjectId ? { ...n, deletedAt: now() } : n,
          ),
        })),

      getActiveNotes: () =>
        get()
          .notes.filter((n) => !n.deletedAt)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),

      getTrash: () =>
        get()
          .notes.filter((n) => n.deletedAt)
          .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()),

      getNotesBySubject: (subjectId) =>
        get()
          .notes.filter((n) => n.subjectId === subjectId && !n.deletedAt)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),

      searchNotes: (query) => {
        const q = query.toLowerCase();
        return get()
          .notes.filter(
            (n) =>
              !n.deletedAt &&
              (n.title.toLowerCase().includes(q) ||
                n.body.toLowerCase().includes(q) ||
                n.tags.some((t) => t.toLowerCase().includes(q))),
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      },

      getNote: (id) => get().notes.find((n) => n.id === id),
    }),
    { name: "ast-notes" },
  ),
);
