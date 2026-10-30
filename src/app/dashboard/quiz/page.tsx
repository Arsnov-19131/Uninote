"use client";

import React, { useState } from "react";
import { useQuizStore } from "@/store/quizzes";
import { useSubjectStore } from "@/store/subjects";
import { useTopicStore } from "@/store/topics";
import { useNoteStore } from "@/store/notes";
import {
  Card,
  Button,
  Badge,
  ProgressBar,
  Input,
  Select,
} from "@/components/ui";
import type {
  QuizDifficulty,
  QuizSourceType,
  QuizQuestion,
} from "@/types";
import {
  BrainCircuit,
  Play,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Award,
  ChevronRight,
  Check,
  Edit2,
} from "lucide-react";
import Link from "next/link";
import { aiGenerateQuiz, aiGradeShortAnswer } from "@/lib/ai";

export default function QuizPage() {
  const subjects = useSubjectStore((s) => s.subjects);
  const topics = useTopicStore((s) => s.topics);
  const allNotes = useNoteStore((s) => s.notes);
  const notes = React.useMemo(() => allNotes.filter((n) => !n.deletedAt), [allNotes]);

  const addQuiz = useQuizStore((s) => s.addQuiz);
  const addQuestions = useQuizStore((s) => s.addQuestions);
  const startAttempt = useQuizStore((s) => s.startAttempt);
  const submitAnswer = useQuizStore((s) => s.submitAnswer);
  const finishAttempt = useQuizStore((s) => s.finishAttempt);
  const overrideScore = useQuizStore((s) => s.overrideScore);
  const answers = useQuizStore((s) => s.answers);

  // Wizard States
  const [phase, setPhase] = useState<"setup" | "taking" | "results">("setup");
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || "");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("all");
  const [sourceType, setSourceType] = useState<QuizSourceType>("vault");
  const [selectedNoteId, setSelectedNoteId] = useState(notes[0]?.id || "");
  const [questionCount, setQuestionCount] = useState(4);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Active Quiz State
  const [activeQuizId, setActiveQuizId] = useState<string>("");
  const [activeAttemptId, setActiveAttemptId] = useState<string>("");
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [attemptAnswerIds, setAttemptAnswerIds] = useState<Record<string, string>>({});

  // Filter topics for selected subject
  const subjectTopics = topics.filter((t) => t.subjectId === selectedSubjectId);

  // Generate Quiz
  const handleGenerateQuiz = async () => {
    setAiError(null);

    const subjectObj = subjects.find((s) => s.id === selectedSubjectId);
    const note =
      sourceType === "vault" ? notes.find((n) => n.id === selectedNoteId) : undefined;
    if (sourceType === "vault" && !note) {
      setAiError("Choose a note from the vault first, or pick another source.");
      return;
    }

    setIsGenerating(true);

    const topicTitles =
      selectedTopicId === "all"
        ? subjectTopics.map((t) => t.title)
        : subjectTopics.filter((t) => t.id === selectedTopicId).map((t) => t.title);

    // Real AI quiz (Gemini through /api/ai). With a vault note, questions come only from that note.
    const result = await aiGenerateQuiz({
      subjectTitle: subjectObj ? subjectObj.title : "Study Subject",
      topicTitles,
      source: note ? { title: note.title, text: note.body } : { title: null, text: null },
      count: questionCount,
      difficulty,
    });

    if (!result.ok) {
      setAiError(result.error);
      setIsGenerating(false);
      return;
    }

    const quiz = addQuiz({
      subjectId: selectedSubjectId,
      topicIds: selectedTopicId === "all" ? subjectTopics.map((t) => t.id) : [selectedTopicId],
      sourceType,
      sourceIds: sourceType === "vault" ? [selectedNoteId] : [],
      settings: {
        questionTypes: ["mcq", "true_false", "short"],
        numberOfQuestions: result.data.questions.length,
        difficulty,
        timed: false,
      },
    });

    const qs = addQuestions(
      result.data.questions.map((q) => ({ quizId: quiz.id, ...q })),
    );
    const attempt = startAttempt(quiz.id);

    setActiveQuizId(quiz.id);
    setActiveAttemptId(attempt.id);
    setActiveQuestions(qs);
    setCurrentQIndex(0);
    setUserAnswers({});
    setIsGenerating(false);
    setPhase("taking");
  };

  // Submit Answer for Current Question
  const handleNextOrFinish = async () => {
    if (isGrading) return;
    const q = activeQuestions[currentQIndex];
    const userAns = userAnswers[q.id] || "";

    // Grade answer
    let score = 0;
    let feedback = "";

    if (q.type === "mcq" || q.type === "true_false") {
      const isCorrect = userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      score = isCorrect ? 1 : 0;
      feedback = isCorrect
        ? "Correct! Well reasoned."
        : `Incorrect. The correct answer is: "${q.correctAnswer}".`;
    } else {
      // Short answer: graded by the AI against the key points and model answer.
      setIsGrading(true);
      setAiError(null);
      const graded = await aiGradeShortAnswer({
        question: q.question,
        modelAnswer: q.correctAnswer,
        keyPoints: q.keyPoints,
        studentAnswer: userAns,
      });
      setIsGrading(false);
      if (!graded.ok) {
        // Stay on this question so the answer is not lost and no wrong score is recorded.
        setAiError(`Could not grade this answer. ${graded.error}`);
        return;
      }
      score = graded.data.score;
      feedback = graded.data.feedback;
    }

    const recordedAns = submitAnswer(activeAttemptId, q.id, userAns, score, feedback);
    setAttemptAnswerIds((prev) => ({ ...prev, [q.id]: recordedAns.id }));

    if (currentQIndex < activeQuestions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      finishAttempt(activeAttemptId);
      setPhase("results");
    }
  };

  // Calculate final score
  const attemptAnswersList = answers.filter((a) => a.attemptId === activeAttemptId);
  const totalScorePercent =
    attemptAnswersList.length > 0
      ? Math.round(
          (attemptAnswersList.reduce((sum, a) => sum + a.score, 0) /
            attemptAnswersList.length) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            Quiz Generator
          </h1>
          <p className="text-sm text-ink-light">
            Test your understanding with AI-generated questions from your notes or syllabus.
          </p>
        </div>
      </div>

      {/* ===== PHASE 1: SETUP WIZARD ===== */}
      {phase === "setup" && (
        <Card className="p-6 bg-surface space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sparkles className="w-5 h-5 text-sky-600" />
            <h2 className="font-heading text-lg font-bold text-ink">
              Configure Your Quiz
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Subject"
              options={subjects.map((s) => ({ value: s.id, label: s.title }))}
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            />

            <Select
              label="Topic"
              options={[
                { value: "all", label: "All Topics (Comprehensive)" },
                ...subjectTopics.map((t) => ({ value: t.id, label: t.title })),
              ]}
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Knowledge Source"
              options={[
                { value: "vault", label: "Notes Vault" },
                { value: "general", label: "General Syllabus Knowledge" },
                { value: "resource", label: "Resources & Excerpts" },
              ]}
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as QuizSourceType)}
            />

            {sourceType === "vault" && notes.length > 0 ? (
              <Select
                label="Target Note"
                options={notes.map((n) => ({ value: n.id, label: n.title }))}
                value={selectedNoteId}
                onChange={(e) => setSelectedNoteId(e.target.value)}
              />
            ) : (
              <Select
                label="Difficulty"
                options={[
                  { value: "easy", label: "Easy (Recall & definitions)" },
                  { value: "medium", label: "Medium (Conceptual understanding)" },
                  { value: "hard", label: "Hard (Exam problems & derivations)" },
                ]}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-light mb-1">
                Number of Questions: {questionCount}
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full accent-brand"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-paper rounded-xl border border-border text-xs text-ink-light">
              <BrainCircuit className="w-5 h-5 text-sky-600 shrink-0" />
              <span>
                Includes <strong>Multiple Choice</strong>, <strong>True/False</strong>, and <strong>Short-Answer</strong> questions.
              </span>
            </div>
          </div>

          {aiError && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
            >
              {aiError}
            </p>
          )}

          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              size="lg"
              disabled={isGenerating}
              onClick={handleGenerateQuiz}
              className="w-full sm:w-auto"
            >
              {isGenerating ? "Synthesizing Quiz with AI..." : "Generate & Start Quiz"}
            </Button>
          </div>
        </Card>
      )}

      {/* ===== PHASE 2: TAKING QUIZ ===== */}
      {phase === "taking" && activeQuestions.length > 0 && (
        <Card className="p-6 bg-surface space-y-6">
          {/* Progress Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Question {currentQIndex + 1} of {activeQuestions.length}
              </span>
              <h3 className="text-xs text-ink-light">
                Type: <span className="font-semibold uppercase">{activeQuestions[currentQIndex]?.type.replace("_", " ")}</span>
              </h3>
            </div>
            <div className="w-32">
              <ProgressBar
                value={((currentQIndex + 1) / activeQuestions.length) * 100}
                color="bg-brand"
              />
            </div>
          </div>

          {/* Current Question */}
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold text-ink leading-snug">
              {activeQuestions[currentQIndex]?.question}
            </h2>

            {/* MCQ & True/False Options */}
            {activeQuestions[currentQIndex]?.options && (
              <div className="space-y-2 pt-2">
                {activeQuestions[currentQIndex]?.options?.map((option, idx) => {
                  const isSelected = userAnswers[activeQuestions[currentQIndex].id] === option;
                  return (
                    <div
                      key={idx}
                      onClick={() =>
                        setUserAnswers((prev) => ({
                          ...prev,
                          [activeQuestions[currentQIndex].id]: option,
                        }))
                      }
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-sky-50 border-sky-400 text-sky-900 font-semibold shadow-xs"
                          : "bg-surface border-border hover:bg-paper"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected ? "bg-sky-600 text-white" : "bg-sidebar text-ink-light"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm">{option}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Short Answer Textarea */}
            {activeQuestions[currentQIndex]?.type === "short" && (
              <div className="space-y-2 pt-2">
                <textarea
                  rows={4}
                  placeholder="Type your explanation or answer in your own words..."
                  value={userAnswers[activeQuestions[currentQIndex].id] || ""}
                  onChange={(e) =>
                    setUserAnswers((prev) => ({
                      ...prev,
                      [activeQuestions[currentQIndex].id]: e.target.value,
                    }))
                  }
                  className="w-full text-sm p-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                <p className="text-[11px] text-ink-faint">
                  AI will grade your explanation based on key points and clarity.
                </p>
              </div>
            )}
          </div>

          {aiError && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
            >
              {aiError}
            </p>
          )}

          {/* Navigation */}
          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              size="md"
              disabled={!userAnswers[activeQuestions[currentQIndex]?.id] || isGrading}
              onClick={handleNextOrFinish}
            >
              {isGrading
                ? "Grading your answer..."
                : currentQIndex === activeQuestions.length - 1
                  ? "Finish & Grade Quiz"
                  : "Next Question →"}
            </Button>
          </div>
        </Card>
      )}

      {/* ===== PHASE 3: RESULTS & GRADING REVIEW ===== */}
      {phase === "results" && (
        <div className="space-y-6 animate-fade-in">
          {/* Score Banner */}
          <Card className="p-6 bg-surface text-center space-y-3">
            <Award className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="font-heading text-2xl font-bold text-ink">
              Quiz Completed!
            </h2>
            <div className="text-4xl font-extrabold text-ink">
              {totalScorePercent}%
            </div>
            <p className="text-xs text-ink-light max-w-md mx-auto">
              Your results have been recorded in the <strong>Progress Tracker</strong>. Topics with lower accuracy are highlighted for future revision.
            </p>

            <div className="flex justify-center gap-3 pt-3">
              <Button size="sm" variant="secondary" onClick={() => setPhase("setup")}>
                <RotateCcw className="w-4 h-4" /> Try Another Quiz
              </Button>
              <Link href="/dashboard/tracker">
                <Button size="sm">
                  View Tracker Readiness <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Detailed Question Review */}
          <div className="space-y-3">
            <h3 className="font-heading text-lg font-bold text-ink">
              Review & AI Explanations
            </h3>

            {activeQuestions.map((q, idx) => {
              const ansObj = attemptAnswersList.find((a) => a.questionId === q.id);
              const score = ansObj ? ansObj.score : 0;
              const isPassed = score >= 0.75;

              return (
                <Card
                  key={q.id}
                  className={`p-4 border-l-4 ${isPassed ? "border-l-emerald-500" : "border-l-red-500"}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-ink-faint">
                      Question {idx + 1}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isPassed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {Math.round(score * 100)}%
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-ink mb-2">
                    {q.question}
                  </h4>

                  <div className="space-y-1 text-xs">
                    <div className="text-ink-light">
                      <strong>Your Answer:</strong> {ansObj?.answer || "(No answer)"}
                    </div>
                    <div className="text-emerald-700">
                      <strong>Model Answer:</strong> {q.correctAnswer}
                    </div>
                    {ansObj?.feedback && (
                      <div className="p-2.5 rounded-lg bg-paper border border-border text-ink-light mt-2">
                        💡 {ansObj.feedback}
                      </div>
                    )}
                  </div>

                  {/* Override Grade Option (per workflow requirements) */}
                  {ansObj && (
                    <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-ink-faint">
                      <span>Disagree with the AI evaluation?</span>
                      <button
                        onClick={() => overrideScore(ansObj.id, score === 1 ? 0.5 : 1)}
                        className="text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Override Grade
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
