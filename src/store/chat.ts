import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatSession, ChatMessage, Keyword, ChatRole, QuizSourceType } from "@/types";
import { generateId, now } from "@/lib/utils";

interface ChatStore {
  sessions: ChatSession[];
  messages: ChatMessage[];
  keywords: Keyword[];

  // Session management
  createSession: (title: string, subjectId?: string | null, sourceSelection?: QuizSourceType | null) => ChatSession;
  updateSession: (id: string, updates: Partial<Pick<ChatSession, "title" | "subjectId" | "sourceSelection">>) => void;
  deleteSession: (id: string) => void;

  // Messages
  addMessage: (sessionId: string, role: ChatRole, content: string) => ChatMessage;
  getMessages: (sessionId: string) => ChatMessage[];

  // Keywords
  addKeyword: (sessionId: string, term: string, definition: string) => Keyword;
  toggleGlossary: (id: string) => void;
  getKeywords: (sessionId: string) => Keyword[];
  getGlossaryKeywords: () => Keyword[];

  // Queries
  getSessions: () => ChatSession[];
  getSessionsBySubject: (subjectId: string) => ChatSession[];
  getSession: (id: string) => ChatSession | undefined;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      messages: [],
      keywords: [],

      createSession: (title, subjectId = null, sourceSelection = null) => {
        const session: ChatSession = {
          id: generateId(),
          title,
          subjectId,
          sourceSelection,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ sessions: [...s.sessions, session] }));
        return session;
      },

      updateSession: (id, updates) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, ...updates, updatedAt: now() } : sess,
          ),
        })),

      deleteSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== id),
          messages: s.messages.filter((m) => m.sessionId !== id),
          keywords: s.keywords.filter((k) => k.sessionId !== id),
        })),

      addMessage: (sessionId, role, content) => {
        const msg: ChatMessage = {
          id: generateId(),
          sessionId,
          role,
          content,
          createdAt: now(),
        };
        set((s) => ({
          messages: [...s.messages, msg],
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId ? { ...sess, updatedAt: now() } : sess,
          ),
        }));
        return msg;
      },

      getMessages: (sessionId) =>
        get()
          .messages.filter((m) => m.sessionId === sessionId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),

      addKeyword: (sessionId, term, definition) => {
        const kw: Keyword = {
          id: generateId(),
          sessionId,
          term,
          definition,
          savedToGlossary: false,
        };
        set((s) => ({ keywords: [...s.keywords, kw] }));
        return kw;
      },

      toggleGlossary: (id) =>
        set((s) => ({
          keywords: s.keywords.map((k) =>
            k.id === id ? { ...k, savedToGlossary: !k.savedToGlossary } : k,
          ),
        })),

      getKeywords: (sessionId) =>
        get().keywords.filter((k) => k.sessionId === sessionId),

      getGlossaryKeywords: () =>
        get().keywords.filter((k) => k.savedToGlossary),

      getSessions: () =>
        [...get().sessions].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),

      getSessionsBySubject: (subjectId) =>
        get()
          .sessions.filter((s) => s.subjectId === subjectId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),

      getSession: (id) => get().sessions.find((s) => s.id === id),
    }),
    { name: "ast-chat" },
  ),
);
