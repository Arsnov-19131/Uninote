"use client";

import React from "react";
import { useSubjectStore } from "@/store/subjects";
import { useTopicStore } from "@/store/topics";
import { useTaskStore } from "@/store/tasks";
import { useQuizStore } from "@/store/quizzes";
import { useProgressStore } from "@/store/progress";
import {
  Card,
  Button,
  Badge,
  ProgressBar,
} from "@/components/ui";
import { daysUntil } from "@/lib/utils";
import {
  BarChart3,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Clock,
  ArrowRight,
  Check,
  X,
  Target,
  BrainCircuit,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default function TrackerPage() {
  const subjects = useSubjectStore((s) => s.subjects);
  const topics = useTopicStore((s) => s.topics);
  const getCoverage = useTopicStore((s) => s.getCoveragePercent);
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const getTopicScores = useQuizStore((s) => s.getTopicScores);

  const allSuggestions = useProgressStore((s) => s.suggestions);
  const suggestions = React.useMemo(
    () =>
      [...allSuggestions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [allSuggestions],
  );
  const updateSuggestionStatus = useProgressStore((s) => s.updateSuggestionStatus);

  // Accept a proposal & optionally create a planner task
  const handleAcceptProposal = (sugId: string, subId: string) => {
    updateSuggestionStatus(sugId, "accepted");
    const sub = subjects.find((s) => s.id === subId);
    if (sub) {
      addTask({
        title: `AI Revision: ${sub.title} Weak Topics`,
        type: "study_block",
        subjectId: sub.id,
        topicId: null,
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        reminderOffsets: [60],
        effortEstimate: 45,
        priority: "high",
        status: "todo",
        description: "Scheduled revision block proposed by Progress Tracker.",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            Readiness & Progress Tracker
          </h1>
          <p className="text-sm text-ink-light">
            Readiness formula combines Quiz scores (60%), Roadmap coverage (30%), and Task completion (10%).
          </p>
        </div>
      </div>

      {/* ===== AI Study Suggestions / Proposals ===== */}
      {suggestions.filter((s) => s.status === "pending").length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-light">
            <Sparkles className="w-4 h-4 text-sky-600" />
            Urgent Action Proposals
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions
              .filter((s) => s.status === "pending")
              .map((sug) => {
                const sub = subjects.find((s) => s.id === sug.subjectId);
                return (
                  <Card
                    key={sug.id}
                    className="p-4 bg-gradient-to-r from-sky-50/80 to-white border-sky-200 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-200 text-sky-900">
                            {sub?.title}
                          </span>
                          <span className="text-[11px] text-sky-700 font-semibold uppercase">
                            {sug.type}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-ink font-medium leading-relaxed">
                          {sug.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-sky-100 text-xs">
                      <span className="text-ink-faint">Accepting adds a revision block to Planner</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateSuggestionStatus(sug.id, "rejected")}
                        >
                          <X className="w-3.5 h-3.5" /> Dismiss
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptProposal(sug.id, sug.subjectId)}
                        >
                          <Check className="w-3.5 h-3.5" /> Accept & Schedule
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* ===== Subjects Readiness Breakdown ===== */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-ink flex items-center gap-2">
          <Target className="w-5 h-5 text-sky-600" />
          Subject-by-Subject Readiness
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((sub) => {
            const coverage = getCoverage(sub.id);
            const subTasks = tasks.filter((t) => t.subjectId === sub.id);
            const completedTasks = subTasks.filter((t) => t.status === "done").length;
            const taskRate =
              subTasks.length > 0 ? Math.round((completedTasks / subTasks.length) * 100) : 100;

            const scores = getTopicScores(sub.id);
            const scoreValues = Object.values(scores);
            const hasQuizData = scoreValues.length > 0;
            const avgQuizScore = hasQuizData
              ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 100)
              : null;

            // Workflow calculation: 60% quiz + 30% coverage + 10% on-time task rate
            const readiness = hasQuizData
              ? Math.round(0.6 * (avgQuizScore ?? 0) + 0.3 * coverage + 0.1 * taskRate)
              : coverage;

            const daysLeft = sub.examDate ? daysUntil(sub.examDate) : null;

            // Identify weak topics (mastery < 60%)
            const subTopics = topics.filter((t) => t.subjectId === sub.id);
            const weakTopics = subTopics.filter((t) => {
              const score = scores[t.id];
              return score !== undefined && score < 0.6;
            });

            return (
              <Card key={sub.id} highlight={sub.color} className="p-5 bg-surface space-y-4">
                {/* Subject Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-ink">
                      {sub.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color={sub.color}>
                        {readiness >= 75
                          ? "Well Prepared"
                          : readiness >= 50
                          ? "On Track"
                          : "Needs Attention"}
                      </Badge>
                      {daysLeft !== null && (
                        <span className="text-xs text-ink-faint">
                          {daysLeft > 0 ? `${daysLeft} days until exam` : "Exam period"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-ink">
                      {readiness}%
                    </span>
                    <span className="block text-[10px] text-ink-faint uppercase font-semibold">
                      Readiness
                    </span>
                  </div>
                </div>

                {/* Readiness Meter */}
                <div>
                  <ProgressBar
                    value={readiness}
                    color={
                      readiness >= 75
                        ? "bg-emerald-500"
                        : readiness >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }
                  />
                </div>

                {/* 3 Contributing Factor Bars */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-paper rounded-xl text-center border border-border">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-ink-faint">
                      Quiz Mastery (60%)
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {hasQuizData ? `${avgQuizScore}%` : "No Data"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-ink-faint">
                      Coverage (30%)
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {coverage}%
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-ink-faint">
                      Tasks Done (10%)
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {completedTasks}/{subTasks.length}
                    </span>
                  </div>
                </div>

                {/* Weak Topics Section */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-ink-light flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Topic Breakdown & Weak Spots
                  </span>

                  {subTopics.length === 0 ? (
                    <p className="text-xs text-ink-faint">No topics mapped in roadmap yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {subTopics.slice(0, 4).map((t) => {
                        const score = scores[t.id];
                        const isTested = score !== undefined;
                        const isWeak = isTested && score < 0.6;

                        return (
                          <span
                            key={t.id}
                            className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                              isWeak
                                ? "bg-red-50 text-red-700 border-red-200"
                                : isTested
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-gray-50 text-gray-600 border-gray-200"
                            }`}
                          >
                            {t.title} ({isTested ? `${Math.round(score * 100)}%` : "Not tested"})
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Quick Links */}
                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <Link
                    href={`/dashboard/roadmap?subject=${sub.id}`}
                    className="text-ink-light hover:text-ink font-semibold"
                  >
                    Check Topics
                  </Link>
                  <Link
                    href={`/dashboard/quiz?subject=${sub.id}`}
                    className="text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
                  >
                    Practice Quiz <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
