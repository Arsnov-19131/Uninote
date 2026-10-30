"use client";

import React, { useMemo } from "react";
import { Bell, CheckCircle2, Circle, Clock, Plus } from "lucide-react";
import type { PlannerTask, Subject } from "@/types";
import { Badge, Button, Card } from "@/components/ui";
import { formatTime } from "@/lib/utils";
import { dayKey, dayKeyOf } from "@/lib/calendar";

interface DayViewProps {
  date: Date;
  tasks: PlannerTask[];
  subjects: Subject[];
  onOpenTask: (task: PlannerTask) => void;
  onToggleDone: (taskId: string) => void;
  onAddOnDay: (day: string) => void;
}

/** One day's tasks in time order. */
export default function DayView({
  date,
  tasks,
  subjects,
  onOpenTask,
  onToggleDone,
  onAddOnDay,
}: DayViewProps) {
  const key = dayKey(date);
  const list = useMemo(
    () =>
      tasks
        .filter((t) => dayKeyOf(t.dueAt) === key)
        .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt)),
    [tasks, key],
  );

  if (list.length === 0) {
    return (
      <div className="p-8 text-center">
        <Clock className="w-8 h-8 text-ink-faint mx-auto mb-2" />
        <p className="text-sm text-ink-light font-medium">Nothing planned for this day</p>
        <p className="text-xs text-ink-faint mt-0.5 mb-4">
          Add a study block, an assignment or an exam.
        </p>
        <Button size="sm" onClick={() => onAddOnDay(key)}>
          <Plus className="w-4 h-4" /> Add task for this day
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {list.map((task) => {
        const sub = subjects.find((s) => s.id === task.subjectId);
        const done = task.status === "done";
        const reminders = task.reminderOffsets.filter((m) => m > 0).length;

        return (
          <Card
            key={task.id}
            highlight={sub?.color}
            className={`flex items-start gap-3 p-3 ${done ? "opacity-60 bg-paper" : "bg-surface"}`}
          >
            <span className="w-16 shrink-0 text-xs font-bold text-ink-light pt-0.5">
              {formatTime(task.dueAt)}
            </span>

            <button
              type="button"
              onClick={() => onToggleDone(task.id)}
              className="text-ink-faint hover:text-ink transition-colors shrink-0 cursor-pointer"
              aria-label={done ? "Mark as not done" : "Mark as done"}
            >
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenTask(task)}
              className="min-w-0 flex-1 text-left cursor-pointer"
            >
              <span
                className={`block text-sm font-semibold ${
                  done ? "line-through text-ink-faint" : "text-ink"
                }`}
              >
                {task.title}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                {sub && <Badge color={sub.color}>{sub.title}</Badge>}
                <span className="uppercase font-bold tracking-wider text-[10px] text-gray-600">
                  {task.type.replace("_", " ")}
                </span>
                <span>{task.priority} priority</span>
                {task.effortEstimate > 0 && <span>{task.effortEstimate} mins</span>}
                {reminders > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    {reminders} {reminders === 1 ? "reminder" : "reminders"}
                  </span>
                )}
              </span>
            </button>
          </Card>
        );
      })}

      <div className="pt-1">
        <Button size="sm" variant="secondary" onClick={() => onAddOnDay(key)}>
          <Plus className="w-4 h-4" /> Add task for this day
        </Button>
      </div>
    </div>
  );
}
