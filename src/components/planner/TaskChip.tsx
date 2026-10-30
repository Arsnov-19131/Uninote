"use client";

import React from "react";
import type { PlannerTask, SubjectColor } from "@/types";
import { cn, formatTime } from "@/lib/utils";

// Full class names are written out so Tailwind can find them.
const CHIP_COLOURS: Record<SubjectColor | "none", string> = {
  yellow: "bg-yellow-100 text-yellow-900 border-yellow-500",
  mint: "bg-emerald-100 text-emerald-900 border-emerald-500",
  pink: "bg-pink-100 text-pink-900 border-pink-500",
  sky: "bg-sky-100 text-sky-900 border-sky-500",
  violet: "bg-violet-100 text-violet-900 border-violet-500",
  orange: "bg-orange-100 text-orange-900 border-orange-500",
  none: "bg-slate-100 text-slate-800 border-slate-400",
};

interface TaskChipProps {
  task: PlannerTask;
  color?: SubjectColor;
  /** Show the time before the title. */
  showTime?: boolean;
  onOpen: (task: PlannerTask) => void;
}

/** A task shown inside a calendar cell. Click or press Enter to open it; drag it onto another day to move it. */
export default function TaskChip({ task, color, showTime, onOpen }: TaskChipProps) {
  const done = task.status === "done";

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task);
        }
      }}
      title={`${task.title} (${formatTime(task.dueAt)}). Drag to another day to move it.`}
      className={cn(
        "text-[11px] font-medium px-1.5 py-0.5 rounded truncate cursor-grab active:cursor-grabbing border-l-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        done ? "bg-gray-100 text-gray-500 line-through border-gray-300" : CHIP_COLOURS[color ?? "none"],
      )}
    >
      {showTime && <span className="font-bold mr-1">{formatTime(task.dueAt)}</span>}
      {task.title}
    </div>
  );
}
