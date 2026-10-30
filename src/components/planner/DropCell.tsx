"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface DropCellProps {
  /** Local day this cell stands for, "YYYY-MM-DD". */
  day: string;
  /** Called when a task is dropped here. Receives the task id carried by the drag. */
  onDropTask: (day: string, taskId: string) => void;
  className?: string;
  children: React.ReactNode;
}

/** A calendar cell that accepts a dragged task and highlights while one is over it. */
export default function DropCell({ day, onDropTask, className, children }: DropCellProps) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        // Ignore leave events that only move between this cell's own children.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropTask(day, id);
      }}
      className={cn(className, over && "bg-sky-50 ring-2 ring-inset ring-sky-400")}
    >
      {children}
    </div>
  );
}
