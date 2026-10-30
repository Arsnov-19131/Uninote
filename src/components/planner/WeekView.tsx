"use client";

import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import type { PlannerTask, Subject } from "@/types";
import { cn } from "@/lib/utils";
import { dayKey, groupTasksByDay, todayKey, weekDays } from "@/lib/calendar";
import TaskChip from "./TaskChip";
import DropCell from "./DropCell";

interface WeekViewProps {
  /** Any day inside the week to show. The week runs Sunday to Saturday. */
  date: Date;
  tasks: PlannerTask[];
  subjects: Subject[];
  onOpenTask: (task: PlannerTask) => void;
  onAddOnDay: (day: string) => void;
  onDropTask: (day: string, taskId: string) => void;
}

/** Seven day columns on a wide screen, a stacked list of days on a phone. */
export default function WeekView({
  date,
  tasks,
  subjects,
  onOpenTask,
  onAddOnDay,
  onDropTask,
}: WeekViewProps) {
  const days = weekDays(date);
  const byDay = useMemo(() => groupTasksByDay(tasks), [tasks]);
  const today = todayKey();

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-border">
      {days.map((d) => {
        const key = dayKey(d);
        const list = byDay.get(key) ?? [];
        const isToday = key === today;

        return (
          <DropCell
            key={key}
            day={key}
            onDropTask={onDropTask}
            className={cn(
              "bg-surface p-2 min-h-[72px] md:min-h-[280px] flex flex-col gap-1.5",
              isToday && "ring-2 ring-inset ring-sky-500",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-faint">
                {d.toLocaleDateString("en-GB", { weekday: "short" })}
                <span
                  className={cn(
                    "text-xs font-bold",
                    isToday
                      ? "w-5 h-5 bg-sky-500 text-white rounded-full flex items-center justify-center text-[11px]"
                      : "text-ink",
                  )}
                >
                  {d.getDate()}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onAddOnDay(key)}
                className="p-1 text-ink-faint hover:text-ink hover:bg-sidebar rounded cursor-pointer"
                title={`Add a task on ${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`}
                aria-label={`Add a task on ${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {list.map((t) => (
                <TaskChip
                  key={t.id}
                  task={t}
                  color={subjects.find((s) => s.id === t.subjectId)?.color}
                  showTime
                  onOpen={onOpenTask}
                />
              ))}
            </div>

            {list.length === 0 && (
              <p className="text-[11px] text-ink-faint">Nothing planned</p>
            )}
          </DropCell>
        );
      })}
    </div>
  );
}
