/*
  Calendar helpers. Everything here works in the viewer's LOCAL time zone, because a "day" in the
  Planner means the day on the student's wall clock. Tasks are stored as UTC instants (ISO strings),
  so the UTC date of a task is often NOT its local date (for example 01:00 in Karachi is still the
  previous day in UTC). Never compare dueAt.slice(0, 10) with a calendar day; use dayKeyOf() instead.
*/

export type PlannerView = "agenda" | "day" | "week" | "month";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Local calendar day as "YYYY-MM-DD". */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local calendar day of a stored ISO instant. */
export function dayKeyOf(iso: string): string {
  return dayKey(new Date(iso));
}

export function todayKey(): string {
  return dayKey(new Date());
}

/** "YYYY-MM-DD" -> local midnight of that day, or null if it is not a real date. */
export function parseDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  // Rejects things like 2026-02-30, which JavaScript would silently roll into March.
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
    ? date
    : null;
}

/** Value for <input type="date"> from a stored instant, in local time. */
export function localDateInput(iso: string): string {
  return dayKeyOf(iso);
}

/** Value for <input type="time"> from a stored instant, in local time. */
export function localTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Calendar-day arithmetic. Using setDate keeps it correct across daylight-saving changes. */
export function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Weeks start on Sunday, matching the month grid. */
export function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -startOfDay(d).getDay());
}

export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Moves a task to another local day and keeps its local time of day.
 * Returns the new stored instant, or null if the target day is not a valid date.
 */
export function moveToDay(dueAtIso: string, targetKey: string): string | null {
  const target = parseDayKey(targetKey);
  const old = new Date(dueAtIso);
  if (!target || Number.isNaN(old.getTime())) return null;
  return new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    old.getHours(),
    old.getMinutes(),
    0,
    0,
  ).toISOString();
}

/** Groups items by local day, each day's list sorted by time. */
export function groupTasksByDay<T extends { dueAt: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  const sorted = [...items].sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  for (const item of sorted) {
    const key = dayKeyOf(item.dueAt);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/** Previous (-1) or next (+1) month, week or day. */
export function stepView(date: Date, view: PlannerView, direction: -1 | 1): Date {
  if (view === "month") return new Date(date.getFullYear(), date.getMonth() + direction, 1);
  if (view === "week") return addDays(date, 7 * direction);
  return addDays(date, direction);
}

/** Heading for the calendar views. */
export function viewTitle(date: Date, view: PlannerView): string {
  if (view === "month") {
    return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
  }
  if (view === "week") {
    const days = weekDays(date);
    const first = days[0];
    const last = days[6];
    const short = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short" });
    return `${short(first)} – ${short(last)} ${last.getFullYear()}`;
  }
  return date.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
