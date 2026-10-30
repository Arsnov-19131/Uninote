import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Quiz,
  QuizQuestion,
  QuizAttempt,
  AttemptAnswer,
  QuizSourceType,
  QuestionType,
  QuizDifficulty,
} from "@/types";
import { generateId, now } from "@/lib/utils";

interface QuizStore {
  quizzes: Quiz[];
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  answers: AttemptAnswer[];

  // Quiz management
  addQuiz: (quiz: Omit<Quiz, "id" | "createdAt">) => Quiz;
  addQuestions: (questions: Omit<QuizQuestion, "id">[]) => QuizQuestion[];
  deleteQuiz: (id: string) => void;

  // Attempt management
  startAttempt: (quizId: string) => QuizAttempt;
  submitAnswer: (attemptId: string, questionId: string, answer: string, score: number, feedback: string) => AttemptAnswer;
  finishAttempt: (attemptId: string) => void;
  overrideScore: (answerId: string, newScore: number) => void;

  // Queries
  getQuizzesBySubject: (subjectId: string) => Quiz[];
  getQuestions: (quizId: string) => QuizQuestion[];
  getAttempts: (quizId: string) => QuizAttempt[];
  getAnswers: (attemptId: string) => AttemptAnswer[];
  getLatestAttempt: (quizId: string) => QuizAttempt | undefined;
  getTopicScores: (subjectId: string) => Record<string, number>;
}

export const useQuizStore = create<QuizStore>()(
  persist(
    (set, get) => ({
      quizzes: [],
      questions: [],
      attempts: [],
      answers: [],

      addQuiz: (quizData) => {
        const quiz: Quiz = { ...quizData, id: generateId(), createdAt: now() };
        set((s) => ({ quizzes: [...s.quizzes, quiz] }));
        return quiz;
      },

      addQuestions: (questionData) => {
        const qs = questionData.map((q) => ({ ...q, id: generateId() }));
        set((s) => ({ questions: [...s.questions, ...qs] }));
        return qs;
      },

      deleteQuiz: (id) =>
        set((s) => ({
          quizzes: s.quizzes.filter((q) => q.id !== id),
          questions: s.questions.filter((q) => q.quizId !== id),
          attempts: s.attempts.filter((a) => a.quizId !== id),
        })),

      startAttempt: (quizId) => {
        const attempt: QuizAttempt = {
          id: generateId(),
          quizId,
          startedAt: now(),
          finishedAt: null,
          totalScore: null,
        };
        set((s) => ({ attempts: [...s.attempts, attempt] }));
        return attempt;
      },

      submitAnswer: (attemptId, questionId, answer, score, feedback) => {
        const a: AttemptAnswer = {
          id: generateId(),
          attemptId,
          questionId,
          answer,
          score,
          feedback,
          overridden: false,
        };
        set((s) => ({ answers: [...s.answers, a] }));
        return a;
      },

      finishAttempt: (attemptId) => {
        const attemptAnswers = get().answers.filter((a) => a.attemptId === attemptId);
        const totalScore =
          attemptAnswers.length > 0
            ? attemptAnswers.reduce((sum, a) => sum + a.score, 0) / attemptAnswers.length
            : 0;
        set((s) => ({
          attempts: s.attempts.map((a) =>
            a.id === attemptId ? { ...a, finishedAt: now(), totalScore } : a,
          ),
        }));
      },

      overrideScore: (answerId, newScore) =>
        set((s) => ({
          answers: s.answers.map((a) =>
            a.id === answerId ? { ...a, score: newScore, overridden: true } : a,
          ),
        })),

      getQuizzesBySubject: (subjectId) =>
        get().quizzes.filter((q) => q.subjectId === subjectId),

      getQuestions: (quizId) =>
        get().questions.filter((q) => q.quizId === quizId),

      getAttempts: (quizId) =>
        get()
          .attempts.filter((a) => a.quizId === quizId)
          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),

      getAnswers: (attemptId) =>
        get().answers.filter((a) => a.attemptId === attemptId),

      getLatestAttempt: (quizId) => {
        const attempts = get().getAttempts(quizId);
        return attempts[0];
      },

      getTopicScores: (subjectId) => {
        const quizzes = get().getQuizzesBySubject(subjectId);
        const scores: Record<string, number[]> = {};

        for (const quiz of quizzes) {
          const attempts = get().getAttempts(quiz.id).filter((a) => a.finishedAt);
          for (const attempt of attempts) {
            const answers = get().getAnswers(attempt.id);
            for (const topicId of quiz.topicIds) {
              if (!scores[topicId]) scores[topicId] = [];
              const avgScore =
                answers.reduce((sum, a) => sum + a.score, 0) / Math.max(answers.length, 1);
              scores[topicId].push(avgScore);
            }
          }
        }

        // Weighted average: recent attempts weighted more
        const result: Record<string, number> = {};
        for (const [topicId, scoreList] of Object.entries(scores)) {
          const recent = scoreList.slice(0, 5);
          const weights = recent.map((_, i) => recent.length - i);
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          result[topicId] =
            recent.reduce((sum, s, i) => sum + s * weights[i], 0) / totalWeight;
        }
        return result;
      },
    }),
    { name: "ast-quizzes" },
  ),
);
