"use client";

import React, { useState } from "react";
import { useTaskStore } from "@/store/tasks";
import { useSubjectStore } from "@/store/subjects";
import {
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  Badge,
  ConfirmDialog,
} from "@/components/ui";
import { cn, formatDate, formatTime } from "@/lib/utils";
import {
  dayKey,
  dayKeyOf,
  groupTasksByDay,
  localDateInput,
  localTimeInput,
  stepView,
  todayKey,
  viewTitle,
  type PlannerView,
} from "@/lib/calendar";
import DayView from "@/components/planner/DayView";
import WeekView from "@/components/planner/WeekView";
import TaskChip from "@/components/planner/TaskChip";
import DropCell from "@/components/planner/DropCell";
import ReminderPicker from "@/components/planner/ReminderPicker";
import type { PlannerTask, TaskPriority, TaskType } from "@/types";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Bell,
} from "lucide-react";

const VIEWS: { value: PlannerView; label: string }[] = [
  { value: "agenda", label: "Agenda" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export default function PlannerPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const toggleDone = useTaskStore((s) => s.toggleDone);
  const moveToDate = useTaskStore((s) => s.moveToDate);
  const subjects = useSubjectStore((s) => s.subjects);

  // View state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<PlannerView>("agenda");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [taskType, setTaskType] = useState<TaskType>("assignment");
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState("14:00");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [effort, setEffort] = useState(60);
  const [description, setDescription] = useState("");
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([60]); // minutes before the task

  // Open modal for creation (optionally on a chosen day) or for editing
  const openModal = (task?: PlannerTask, initialDay?: string) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setSubjectId(task.subjectId || "");
      setTaskType(task.type);
      // Local date and time, so a task near midnight keeps its day when edited.
      setDate(localDateInput(task.dueAt));
      setTime(localTimeInput(task.dueAt));
      setPriority(task.priority);
      setEffort(task.effortEstimate);
      setDescription(task.description);
      setReminderOffsets(task.reminderOffsets.filter((m) => m > 0));
    } else {
      setEditingTask(null);
      setTitle("");
      setSubjectId(subjects[0]?.id || "");
      setTaskType("assignment");
      setDate(initialDay ?? todayKey());
      setTime("14:00");
      setPriority("medium");
      setEffort(60);
      setDescription("");
      setReminderOffsets([60]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const dueAt = new Date(`${date}T${time}:00`).toISOString();
    const offsets = [...reminderOffsets].sort((a, b) => b - a);

    if (editingTask) {
      updateTask(editingTask.id, {
        title: title.trim(),
        subjectId: subjectId || null,
        type: taskType,
        dueAt,
        priority,
        effortEstimate: Number(effort),
        description: description.trim(),
        reminderOffsets: offsets,
      });
    } else {
      addTask({
        title: title.trim(),
        subjectId: subjectId || null,
        topicId: null,
        type: taskType,
        dueAt,
        priority,
        status: "todo",
        effortEstimate: Number(effort),
        description: description.trim(),
        reminderOffsets: offsets,
      });

      // Reminders are created and kept up to date by ReminderEngine from the task's reminderOffsets.
    }

    setIsModalOpen(false);
  };

  // Drag and drop: move a task to another day, keeping its time. Reminders follow automatically.
  const handleDropTask = (day: string, taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || dayKeyOf(task.dueAt) === day) return;
    moveToDate(taskId, day);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterSubject !== "all" && t.subjectId !== filterSubject) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    return true;
  });

  // Navigation for the day, week and month views
  const goPrev = () => setCurrentDate(stepView(currentDate, viewMode, -1));
  const goNext = () => setCurrentDate(stepView(currentDate, viewMode, 1));

  // Build calendar days for Month view
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const tasksByDay = groupTasksByDay(filteredTasks);
  const today = todayKey();

  const stepLabel = viewMode === "month" ? "month" : viewMode === "week" ? "week" : "day";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            Study Planner
          </h1>
          <p className="text-sm text-ink-light">
            Track assignments, exams, and AI-suggested revision blocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.value}
                onClick={() => setViewMode(v.value)}
                aria-pressed={viewMode === v.value}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  viewMode === v.value
                    ? "bg-brand text-white"
                    : "text-ink-light hover:text-ink"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => openModal()}>
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2 text-xs font-medium text-ink-faint">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </div>

        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-surface text-ink focus:outline-none"
        >
          <option value="all">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-surface text-ink focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="assignment">Assignment</option>
          <option value="study_block">Study Block</option>
          <option value="class_task">Class Task</option>
          <option value="exam">Exam</option>
          <option value="project">Project</option>
          <option value="hackathon">Hackathon</option>
        </select>

        <span className="text-xs text-ink-faint ml-auto">
          Showing {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      {/* ===== AGENDA VIEW ===== */}
      {viewMode === "agenda" && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card className="text-center py-12">
              <CalendarIcon className="w-8 h-8 text-ink-faint mx-auto mb-2" />
              <p className="text-sm text-ink-light font-medium">No tasks found</p>
              <p className="text-xs text-ink-faint mt-0.5">Click "Add Task" to plan your next study block.</p>
            </Card>
          ) : (
            filteredTasks
              .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
              .map((task) => {
                const sub = subjects.find((s) => s.id === task.subjectId);
                const isDone = task.status === "done";
                const isOverdue = new Date(task.dueAt) < new Date() && !isDone;
                const reminderCount = task.reminderOffsets.filter((m) => m > 0).length;

                return (
                  <Card
                    key={task.id}
                    highlight={sub?.color}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-all ${
                      isDone ? "opacity-60 bg-paper" : "bg-surface"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => toggleDone(task.id)}
                        className="text-ink-faint hover:text-ink transition-colors mt-0.5 shrink-0"
                        aria-label={isDone ? "Mark as not done" : "Mark as done"}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm sm:text-base font-semibold ${
                              isDone ? "line-through text-ink-faint" : "text-ink"
                            }`}
                          >
                            {task.title}
                          </span>
                          {sub && <Badge color={sub.color}>{sub.title}</Badge>}
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                            {task.type.replace("_", " ")}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              task.priority === "high"
                                ? "bg-red-100 text-red-700"
                                : task.priority === "medium"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-ink-light line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint pt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(task.dueAt)} at {formatTime(task.dueAt)}
                          </span>
                          {task.effortEstimate > 0 && (
                            <span>{task.effortEstimate} mins estimate</span>
                          )}
                          {reminderCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Bell className="w-3.5 h-3.5" />
                              {reminderCount} {reminderCount === 1 ? "reminder" : "reminders"}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-red-600 font-bold">⚠️ Overdue</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Postpone 1 day button (also the way to move a task on a phone, where dragging is not available) */}
                      <button
                        onClick={() => {
                          const current = new Date(task.dueAt);
                          current.setDate(current.getDate() + 1);
                          moveToDate(task.id, current.toISOString());
                        }}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-surface text-ink-light hover:bg-sidebar transition-colors"
                        title="Move forward 1 day"
                      >
                        +1 Day
                      </button>
                      <button
                        onClick={() => openModal(task)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-sidebar hover:bg-border text-ink font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingTaskId(task.id)}
                        className="p-1.5 rounded-lg text-ink-faint hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete task"
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })
          )}
        </div>
      )}

      {/* ===== DAY, WEEK AND MONTH VIEWS ===== */}
      {viewMode !== "agenda" && (
        <Card noPadding className="overflow-hidden bg-surface">
          {/* Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-heading text-lg font-bold text-ink">
              {viewTitle(currentDate, viewMode)}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                className="p-1.5 rounded-lg border border-border hover:bg-sidebar cursor-pointer"
                aria-label={`Previous ${stepLabel}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-sidebar cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={goNext}
                className="p-1.5 rounded-lg border border-border hover:bg-sidebar cursor-pointer"
                aria-label={`Next ${stepLabel}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {(viewMode === "week" || viewMode === "month") && (
            <p className="hidden md:block px-4 py-1.5 text-xs text-ink-faint bg-paper border-b border-border">
              Drag a task onto another day to move it. It keeps its time, and its reminders move with it.
            </p>
          )}

          {/* ===== DAY VIEW ===== */}
          {viewMode === "day" && (
            <DayView
              date={currentDate}
              tasks={filteredTasks}
              subjects={subjects}
              onOpenTask={(t) => openModal(t)}
              onToggleDone={toggleDone}
              onAddOnDay={(day) => openModal(undefined, day)}
            />
          )}

          {/* ===== WEEK VIEW ===== */}
          {viewMode === "week" && (
            <WeekView
              date={currentDate}
              tasks={filteredTasks}
              subjects={subjects}
              onOpenTask={(t) => openModal(t)}
              onAddOnDay={(day) => openModal(undefined, day)}
              onDropTask={handleDropTask}
            />
          )}

          {/* ===== MONTH VIEW ===== */}
          {viewMode === "month" && (
            <>
              {/* Days Header */}
              <div className="grid grid-cols-7 border-b border-border bg-sidebar text-center text-xs font-semibold text-ink-faint py-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border bg-border">
                {/* Blank leading days */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`blank-${i}`} className="min-h-[90px] bg-paper/50 p-1.5" />
                ))}

                {/* Real month days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNumber = i + 1;
                  const cellKey = dayKey(new Date(year, month, dayNumber));
                  const dayTasks = tasksByDay.get(cellKey) ?? [];
                  const isTodayCell = cellKey === today;

                  return (
                    <DropCell
                      key={`day-${dayNumber}`}
                      day={cellKey}
                      onDropTask={handleDropTask}
                      className={cn(
                        "min-h-[90px] bg-surface p-1.5 flex flex-col justify-between group hover:bg-paper transition-colors",
                        isTodayCell && "ring-2 ring-inset ring-sky-500",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isTodayCell
                              ? "w-5 h-5 bg-sky-500 text-white rounded-full flex items-center justify-center text-[11px]"
                              : "text-ink-light"
                          }`}
                        >
                          {dayNumber}
                        </span>
                        <button
                          onClick={() => openModal(undefined, cellKey)}
                          className="md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 p-0.5 text-ink-faint hover:text-ink rounded cursor-pointer"
                          title="Add task here"
                          aria-label={`Add a task on day ${dayNumber}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Tasks in day */}
                      <div className="space-y-1 mt-1 overflow-y-auto max-h-[80px]">
                        {dayTasks.map((t) => (
                          <TaskChip
                            key={t.id}
                            task={t}
                            color={subjects.find((s) => s.id === t.subjectId)?.color}
                            onOpen={(task) => openModal(task)}
                          />
                        ))}
                      </div>
                    </DropCell>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Task Add / Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? "Edit Task" : "Add Planner Task"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Physics Problem Set 4"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Subject"
              options={subjects.map((s) => ({ value: s.id, label: s.title }))}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            />

            <Select
              label="Type"
              options={[
                { value: "assignment", label: "Assignment" },
                { value: "study_block", label: "Study Block" },
                { value: "class_task", label: "Class Task" },
                { value: "exam", label: "Exam" },
                { value: "project", label: "Project" },
                { value: "hackathon", label: "Hackathon" },
                { value: "custom", label: "Custom" },
              ]}
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label="Due Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              type="time"
              label="Due Time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Priority"
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            />
            <Input
              type="number"
              label="Effort (mins)"
              value={effort}
              onChange={(e) => setEffort(Number(e.target.value))}
              min={5}
              step={5}
            />
          </div>

          <ReminderPicker value={reminderOffsets} onChange={setReminderOffsets} />

          <Textarea
            label="Description / Notes (Optional)"
            placeholder="Key formulas to remember, pages to read, or exercise numbers..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {editingTask ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deletingTaskId)}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={() => {
          if (deletingTaskId) deleteTask(deletingTaskId);
        }}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
