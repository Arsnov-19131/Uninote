// ============================================================
// AI Study Toolkit — Shared Types
// All features share these types so they stay connected.
// ============================================================

// ---------- Subjects ----------
export interface Subject {
  id: string;
  title: string;
  color: SubjectColor;
  examDate?: string; // ISO date
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type SubjectColor =
  | "yellow"
  | "mint"
  | "pink"
  | "sky"
  | "violet"
  | "orange";

export const SUBJECT_COLORS: Record<SubjectColor, { bg: string; text: string; border: string; light: string }> = {
  yellow: { bg: "bg-yellow-200", text: "text-yellow-900", border: "border-yellow-400", light: "bg-yellow-50" },
  mint:   { bg: "bg-emerald-200", text: "text-emerald-900", border: "border-emerald-400", light: "bg-emerald-50" },
  pink:   { bg: "bg-pink-200", text: "text-pink-900", border: "border-pink-400", light: "bg-pink-50" },
  sky:    { bg: "bg-sky-200", text: "text-sky-900", border: "border-sky-400", light: "bg-sky-50" },
  violet: { bg: "bg-violet-200", text: "text-violet-900", border: "border-violet-400", light: "bg-violet-50" },
  orange: { bg: "bg-orange-200", text: "text-orange-900", border: "border-orange-400", light: "bg-orange-50" },
};

// ---------- Roadmap / Topics ----------
export interface Topic {
  id: string;
  subjectId: string;
  parentTopicId: string | null;
  title: string;
  covered: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- Planner / Tasks ----------
export type TaskType =
  | "assignment"
  | "project"
  | "class_task"
  | "hackathon"
  | "exam"
  | "study_block"
  | "custom";

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface PlannerTask {
  id: string;
  title: string;
  type: TaskType;
  subjectId: string | null;
  topicId: string | null;
  dueAt: string; // ISO datetime
  reminderOffsets: number[]; // minutes before due
  effortEstimate: number; // minutes
  priority: TaskPriority;
  status: TaskStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Notifications ----------
export type NotificationChannel = "push" | "in_app" | "email";
export type NotificationStatus = "pending" | "sent" | "failed";

export interface AppNotification {
  id: string;
  taskId: string;
  message: string;
  sendAt: string; // ISO datetime
  channel: NotificationChannel;
  sentAt: string | null;
  status: NotificationStatus;
  read: boolean;
  createdAt: string;
  /** Minutes before the task's due time this reminder was set for. Missing on old entries. */
  offsetMinutes?: number;
  /** The task's due time when this reminder was created. Missing on old entries. */
  dueAt?: string;
}

// ---------- Notes Vault ----------
export type NoteFormat = "markdown" | "text";

export interface Note {
  id: string;
  title: string;
  body: string;
  format: NoteFormat;
  subjectId: string | null;
  tags: string[];
  deletedAt: string | null; // soft delete (Trash)
  createdAt: string;
  updatedAt: string;
}

// ---------- Resources ----------
export type ResourceKind = "local_file" | "excerpt" | "link";

export interface Resource {
  id: string;
  title: string;
  kind: ResourceKind;
  content: string; // for excerpts/text, or file reference
  subjectId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Quiz ----------
export type QuestionType = "mcq" | "true_false" | "short";
export type QuizDifficulty = "easy" | "medium" | "hard";
export type QuizSourceType = "vault" | "resource" | "upload" | "general";

export interface Quiz {
  id: string;
  subjectId: string;
  topicIds: string[];
  sourceType: QuizSourceType;
  sourceIds: string[];
  settings: {
    questionTypes: QuestionType[];
    numberOfQuestions: number;
    difficulty: QuizDifficulty;
    timed: boolean;
    timeLimit?: number; // seconds
  };
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  type: QuestionType;
  question: string;
  options: string[] | null; // for MCQ
  correctAnswer: string;
  keyPoints: string[];
  sourceReference: string | null;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  startedAt: string;
  finishedAt: string | null;
  totalScore: number | null; // 0 to 1
}

export interface AttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  answer: string;
  score: number; // 0 to 1
  feedback: string;
  overridden: boolean;
}

// ---------- Chat ----------
export interface ChatSession {
  id: string;
  title: string;
  subjectId: string | null;
  sourceSelection: QuizSourceType | null;
  createdAt: string;
  updatedAt: string;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface Keyword {
  id: string;
  sessionId: string;
  term: string;
  definition: string;
  savedToGlossary: boolean;
}

// ---------- Progress ----------
export interface ProgressSnapshot {
  id: string;
  subjectId: string;
  readinessPercent: number;
  coveragePercent: number;
  quizScorePercent: number | null;
  weakTopicIds: string[];
  calculatedAt: string;
}

export type SuggestionType = "study" | "reorder";
export type SuggestionStatus = "pending" | "accepted" | "rejected";

export interface Suggestion {
  id: string;
  type: SuggestionType;
  subjectId: string;
  message: string;
  payload: Record<string, unknown>;
  status: SuggestionStatus;
  createdAt: string;
}

// ---------- User Profile ----------
export type ReadingLevel = "simple" | "normal" | "detailed";

export interface UserProfile {
  id: string;
  displayName: string;
  readingLevel: ReadingLevel;
  timezone: string;
  notificationsEnabled: boolean;
  emailBackupEnabled: boolean;
  email: string;
}
