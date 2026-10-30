/*
  The only place pages talk to the AI. Every call goes to /api/ai, which holds the
  Gemini key on the server. To change provider later, change src/app/api/ai/route.ts only.
*/
import type { QuestionType, QuizDifficulty, ReadingLevel } from "@/types";

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ---------- Shared shapes (the route validates against these) ----------

export interface AiKeyword {
  term: string;
  definition: string;
}

export interface AiExplainResult {
  reply: string; // Markdown
  keywords: AiKeyword[];
}

export interface AiQuizQuestion {
  type: QuestionType;
  question: string;
  options: string[] | null;
  correctAnswer: string;
  keyPoints: string[];
  sourceReference: string | null;
}

export interface AiQuizResult {
  questions: AiQuizQuestion[];
}

export interface AiGradeResult {
  score: number; // 0 to 1
  feedback: string;
}

export interface AiTopic {
  title: string;
  children: string[];
}

export interface AiRoadmapResult {
  topics: AiTopic[];
}

// ---------- Requests ----------

export interface AiSource {
  /** Where the material comes from, e.g. the note title. Null means general knowledge. */
  title: string | null;
  /** The material itself. Null means general knowledge. */
  text: string | null;
}

async function call<T>(job: string, payload: Record<string, unknown>): Promise<AiResult<T>> {
  // Fail fast and clearly instead of waiting on a request that can't succeed.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      ok: false,
      error: "You're offline. AI features need a connection — reconnect and try again.",
    };
  }
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job, ...payload }),
    });
    const body = (await res.json().catch(() => null)) as AiResult<T> | null;
    if (!body || typeof body.ok !== "boolean") {
      return { ok: false, error: "The AI service sent an unreadable answer. Try again." };
    }
    return body;
  } catch {
    return {
      ok: false,
      error: "Could not reach the AI service. Check your connection and try again.",
    };
  }
}

export function aiExplain(input: {
  question: string;
  level: ReadingLevel;
  subjectTitle: string | null;
  source: AiSource;
  history: { role: "user" | "assistant"; content: string }[];
}) {
  return call<AiExplainResult>("explain", input);
}

export function aiGenerateQuiz(input: {
  subjectTitle: string;
  topicTitles: string[];
  source: AiSource;
  count: number;
  difficulty: QuizDifficulty;
}) {
  return call<AiQuizResult>("quiz", input);
}

export function aiGradeShortAnswer(input: {
  question: string;
  modelAnswer: string;
  keyPoints: string[];
  studentAnswer: string;
}) {
  return call<AiGradeResult>("grade", input);
}

export function aiExtractTopics(input: { subjectTitle: string; text: string }) {
  return call<AiRoadmapResult>("roadmap", input);
}
