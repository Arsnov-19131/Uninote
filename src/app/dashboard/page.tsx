"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSubjectStore } from "@/store/subjects";
import { useTopicStore } from "@/store/topics";
import { useTaskStore } from "@/store/tasks";
import { useProgressStore } from "@/store/progress";
import { useQuizStore } from "@/store/quizzes";
import { Card, Button, Badge, ProgressBar, Modal, Input, Select } from "@/components/ui";
import { formatDate, daysUntil, truncate } from "@/lib/utils";
import { todayKey } from "@/lib/calendar";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  BookOpen,
  BrainCircuit,
  MessageSquare,
  AlertTriangle,
  Flame,
  Check,
  X,
} from "lucide-react";
import type { TaskType, TaskPriority } from "@/types";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const subjects = useSubjectStore((s) => s.subjects);
  const getCoverage = useTopicStore((s) => s.getCoveragePercent);
  const allTasks = useTaskStore((s) => s.tasks);
  const tasks = React.useMemo(() => {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 7);
    return allTasks
      .filter((t) => {
        const d = new Date(t.dueAt);
        return d >= today && d <= future && t.status !== "done";
      })
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }, [allTasks]);
  const toggleDone = useTaskStore((s) => s.toggleDone);
  const addTask = useTaskStore((s) => s.addTask);
  const allSuggestions = useProgressStore((s) => s.suggestions);
  const suggestions = React.useMemo(() => {
    return allSuggestions.filter((s) => s.status === "pending");
  }, [allSuggestions]);
  const updateSuggestionStatus = useProgressStore((s) => s.updateSuggestionStatus);
  const getTopicScores = useQuizStore((s) => s.getTopicScores);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubjectId, setTaskSubjectId] = useState("");
  // Local day, not new Date().toISOString().slice(0, 10) — that's the UTC
  // date, which is wrong for anyone east or west of UTC near midnight.
  const [taskDueDate, setTaskDueDate] = useState(todayKey());
  const [taskDueTime, setTaskDueTime] = useState("18:00");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskType, setTaskType] = useState<TaskType>("assignment");

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    addTask({
      title: taskTitle.trim(),
      type: taskType,
      subjectId: taskSubjectId || (subjects[0]?.id ?? null),
      topicId: null,
      dueAt: new Date(`${taskDueDate}T${taskDueTime}:00`).toISOString(),
      reminderOffsets: [60],
      effortEstimate: 60,
      priority: taskPriority,
      status: "todo",
      description: "",
    });

    setTaskTitle("");
    setIsTaskModalOpen(false);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ===== Welcome Banner ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
              <Flame className="w-3.5 h-3.5 text-amber-600" /> Focus Mode
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            Ready to study, Arslan?
          </h1>
          <p className="text-sm text-ink-light mt-0.5">
            You have {tasks.filter((t) => t.status !== "done").length} tasks coming up in the next 7 days.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setTaskDueDate(todayKey()); // re-read in case the tab's been open since yesterday
              setIsTaskModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Add Task
          </Button>
          <Link href="/dashboard/chat">
            <Button size="sm" variant="secondary">
              <MessageSquare className="w-4 h-4" /> Ask AI
            </Button>
          </Link>
          <Link href="/dashboard/quiz">
            <Button size="sm" variant="secondary">
              <BrainCircuit className="w-4 h-4" /> Quiz Me
            </Button>
          </Link>
        </div>
      </div>

      {/* ===== AI Study Suggestions ===== */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-light">
            <Sparkles className="w-4 h-4 text-sky-600" />
            AI Study Proposals ({suggestions.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((sug) => {
              const sub = subjects.find((s) => s.id === sug.subjectId);
              return (
                <div
                  key={sug.id}
                  className="flex items-start justify-between gap-3 p-4 bg-sky-50/70 border border-sky-200 rounded-xl"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-200 text-sky-900">
                        {sub?.title ?? "Study Suggestion"}
                      </span>
                      <span className="text-[11px] text-sky-800 font-medium capitalize">
                        {sug.type} proposal
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-ink font-medium leading-relaxed">
                      {sug.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateSuggestionStatus(sug.id, "accepted")}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                      title="Accept proposal"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateSuggestionStatus(sug.id, "rejected")}
                      className="p-1.5 rounded-lg bg-surface border border-border text-ink-faint hover:text-ink transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Subjects Overview (Roadmap + Readiness) ===== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-ink-light" />
            Your Subjects & Readiness
          </h2>
          <Link
            href="/dashboard/roadmap"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            Open Roadmap <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjects.map((sub) => {
            const coverage = getCoverage(sub.id);
            const scores = getTopicScores(sub.id);
            const scoreValues = Object.values(scores);
            const avgScore =
              scoreValues.length > 0
                ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 100)
                : null;
            // Workflow formula: 60% Quiz score + 30% Coverage + 10% On-time (or just coverage if no quiz yet)
            const readiness =
              avgScore !== null ? Math.round(0.6 * avgScore + 0.3 * coverage + 10) : coverage;

            const examDays = sub.examDate ? daysUntil(sub.examDate) : null;

            return (
              <Card
                key={sub.id}
                highlight={sub.color}
                className="hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-heading text-lg font-bold text-ink line-clamp-1">
                      {sub.title}
                    </h3>
                    {examDays !== null && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          examDays <= 7
                            ? "bg-red-100 text-red-700"
                            : examDays <= 14
                            ? "bg-amber-100 text-amber-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {examDays <= 0 ? "Today!" : `${examDays}d left`}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 my-3">
                    <div>
                      <div className="flex justify-between text-xs text-ink-light mb-1">
                        <span>Readiness</span>
                        <span className="font-bold">{readiness}%</span>
                      </div>
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
                    <div className="flex justify-between text-[11px] text-ink-faint">
                      <span>Roadmap Coverage: {coverage}%</span>
                      <span>Quiz Avg: {avgScore !== null ? `${avgScore}%` : "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <Link
                    href={`/dashboard/roadmap?subject=${sub.id}`}
                    className="text-ink-light hover:text-ink font-medium"
                  >
                    View Topics
                  </Link>
                  <Link
                    href={`/dashboard/quiz?subject=${sub.id}`}
                    className="text-sky-600 hover:text-sky-700 font-semibold"
                  >
                    Take Quiz →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ===== Bottom Split: Upcoming Planner + Quick Study Tips ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planner items (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Calendar className="w-5 h-5 text-ink-light" />
              Upcoming Planner Tasks
            </h2>
            <Link
              href="/dashboard/planner"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              Open Calendar <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="p-8 text-center bg-surface rounded-xl border border-border text-ink-faint text-sm">
                No tasks scheduled for the next 7 days. Enjoy your day or add a new study block!
              </div>
            ) : (
              tasks.map((task) => {
                const sub = subjects.find((s) => s.id === task.subjectId);
                const isDone = task.status === "done";
                const isOverdue = new Date(task.dueAt) < new Date() && !isDone;

                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                      isDone
                        ? "bg-paper border-border opacity-60"
                        : "bg-surface border-border hover:border-brand/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => toggleDone(task.id)}
                        className="text-ink-faint hover:text-ink transition-colors shrink-0"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-medium ${
                              isDone ? "line-through text-ink-faint" : "text-ink"
                            }`}
                          >
                            {task.title}
                          </span>
                          {sub && (
                            <Badge color={sub.color}>
                              {sub.title}
                            </Badge>
                          )}
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                            {task.type.replace("_", " ")}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-ink-faint mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(task.dueAt)}
                          </span>
                          {task.effortEstimate > 0 && (
                            <span>{task.effortEstimate} mins</span>
                          )}
                          {isOverdue && (
                            <span className="text-red-600 font-bold flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleDone(task.id)}
                      className="text-xs font-medium px-2.5 py-1 rounded-md bg-sidebar hover:bg-border text-ink-light transition-colors shrink-0"
                    >
                      {isDone ? "Undo" : "Mark Done"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Study tips & Quick navigation (1 col) */}
        <div className="space-y-4">
          <Card className="p-5 bg-gradient-to-br from-sidebar to-white border-border">
            <div className="flex items-center gap-2 mb-2 text-amber-700">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-heading font-bold text-base text-ink">
                Workflow Tip
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-ink-light leading-relaxed">
              Quizzes directly feed your <strong>Readiness Score</strong> in the Tracker! Ask the Chatbot to explain a concept, save it to the Vault, and generate a quiz to test your mastery.
            </p>
            <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
              <Link
                href="/dashboard/chat"
                className="text-xs font-semibold text-ink hover:text-sky-600 flex items-center justify-between"
              >
                <span>💬 Chatbot with Simple Explanations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/dashboard/vault"
                className="text-xs font-semibold text-ink hover:text-sky-600 flex items-center justify-between"
              >
                <span>📝 Markdown Notes Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/dashboard/tracker"
                className="text-xs font-semibold text-ink hover:text-sky-600 flex items-center justify-between"
              >
                <span>📊 Readiness & Weak Topics Engine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ===== Add Task Modal ===== */}
      <Modal
        open={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Planner Task / Study Block"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g. Chapter 4 Practice Problems or Calculus Revision"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Subject"
              options={subjects.map((s) => ({ value: s.id, label: s.title }))}
              value={taskSubjectId}
              onChange={(e) => setTaskSubjectId(e.target.value)}
            />

            <Select
              label="Type"
              options={[
                { value: "assignment", label: "Assignment" },
                { value: "study_block", label: "Study Block" },
                { value: "class_task", label: "Class Task" },
                { value: "project", label: "Project" },
                { value: "exam", label: "Exam" },
                { value: "hackathon", label: "Hackathon" },
                { value: "custom", label: "Custom" },
              ]}
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              type="date"
              label="Date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              required
            />
            <Input
              type="time"
              label="Time"
              value={taskDueTime}
              onChange={(e) => setTaskDueTime(e.target.value)}
              required
            />
            <Select
              label="Priority"
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsTaskModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save to Planner
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
