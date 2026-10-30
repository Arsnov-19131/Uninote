import type { AppNotification, PlannerTask } from "@/types";

/*
  Reminder logic, kept free of React and the browser so it can be tested on its own.

  The rule: reminders are DERIVED from tasks. Each task that is not done and has reminder
  offsets (minutes before the due time) should have one pending notification per offset.
  Every cycle we reconcile the stored notifications with the tasks, then fire the ones whose
  time has come. That way editing, completing, deleting or moving a task never leaves a stale
  or duplicate reminder behind.
*/

const MINUTE = 60_000;

/** Device pop-ups are skipped for reminders that are more than this late. They still appear in the app. */
export const POPUP_MAX_LATE_MS = 6 * 60 * MINUTE;

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function keyOf(taskId: string, offsetMinutes: number, sendMs: number): string {
  return `${taskId}|${offsetMinutes}|${sendMs}`;
}

/** "1 day", "2 hours", "15 minutes" */
export function durationPhrase(minutes: number): string {
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export function reminderMessage(title: string, offsetMinutes: number): string {
  return `Reminder: "${title}" is due in ${durationPhrase(offsetMinutes)}.`;
}

/** Wording used when a reminder is sent after the task time has already passed. */
function lateMessage(title: string, dueMs: number, nowMs: number): string {
  if (nowMs - dueMs < MINUTE) return `Reminder: "${title}" is due now.`;
  return `Reminder: "${title}" was due ${new Date(dueMs).toLocaleString()}.`;
}

export interface ReminderCycle {
  /** The notification list after reconciling and firing. */
  next: AppNotification[];
  /** Notifications that were fired in this cycle (status changed to "sent"). */
  fired: AppNotification[];
  /** False when nothing changed, so callers can skip saving. */
  changed: boolean;
}

export function runReminderCycle(
  tasks: PlannerTask[],
  notifications: AppNotification[],
  nowMs: number,
): ReminderCycle {
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  // 1. Which reminders should exist right now.
  const wanted = new Map<
    string,
    { task: PlannerTask; offset: number; sendMs: number; dueMs: number }
  >();
  for (const task of tasks) {
    if (task.status === "done") continue;
    const dueMs = Date.parse(task.dueAt);
    if (Number.isNaN(dueMs)) continue;
    for (const offset of new Set(task.reminderOffsets ?? [])) {
      if (!Number.isFinite(offset) || offset <= 0) continue;
      const sendMs = dueMs - offset * MINUTE;
      wanted.set(keyOf(task.id, offset, sendMs), { task, offset, sendMs, dueMs });
    }
  }

  // 2. Reminders that were already sent (or failed) are history. They also stop us creating the same one again.
  const history = new Set<string>();
  for (const n of notifications) {
    if (n.status !== "pending" && n.offsetMinutes !== undefined) {
      history.add(keyOf(n.taskId, n.offsetMinutes, Date.parse(n.sendAt)));
    }
  }

  // 3. Keep pending reminders that are still wanted. Drop the rest (task done, deleted, edited, or an old-style entry).
  let changed = false;
  const kept: AppNotification[] = [];
  const pendingKeys = new Set<string>();
  for (const n of notifications) {
    if (n.status !== "pending") {
      kept.push(n);
      continue;
    }
    const key =
      n.offsetMinutes === undefined
        ? null
        : keyOf(n.taskId, n.offsetMinutes, Date.parse(n.sendAt));
    if (key && wanted.has(key) && !history.has(key) && !pendingKeys.has(key)) {
      pendingKeys.add(key);
      kept.push(n);
    } else {
      changed = true;
    }
  }

  // 4. Create reminders that are wanted but missing. Reminders whose time already passed are not invented.
  const createdAt = new Date(nowMs).toISOString();
  for (const [key, w] of wanted) {
    if (pendingKeys.has(key) || history.has(key)) continue;
    if (w.sendMs <= nowMs) continue;
    kept.push({
      id: makeId(),
      taskId: w.task.id,
      message: reminderMessage(w.task.title, w.offset),
      sendAt: new Date(w.sendMs).toISOString(),
      channel: "in_app",
      sentAt: null,
      status: "pending",
      read: false,
      createdAt,
      offsetMinutes: w.offset,
      dueAt: w.task.dueAt,
    });
    changed = true;
  }

  // 5. Fire everything that is due. Late reminders are still delivered, never lost.
  const fired: AppNotification[] = [];
  const next = kept.map((n) => {
    if (n.status !== "pending" || Date.parse(n.sendAt) > nowMs) return n;
    const task = taskById.get(n.taskId);
    const dueMs = n.dueAt ? Date.parse(n.dueAt) : task ? Date.parse(task.dueAt) : NaN;
    const title = task?.title ?? "A task";
    const sent: AppNotification = {
      ...n,
      status: "sent",
      sentAt: new Date(nowMs).toISOString(),
      message: !Number.isNaN(dueMs) && nowMs >= dueMs ? lateMessage(title, dueMs, nowMs) : n.message,
    };
    fired.push(sent);
    changed = true;
    return sent;
  });

  return { next: changed ? next : notifications, fired, changed };
}
