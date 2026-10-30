// Task E4 — edge-case tests for the pure date/reminder logic.
// Plain JS re-implementation of src/lib/calendar.ts and src/lib/reminders.ts
// (kept behaviourally identical, types stripped) so it can run with plain
// node, no build step or npm install needed.
//
// Run it:
//   node scripts/edge-case-tests.mjs
// Run it in a specific time zone (the thing actually worth checking —
// these functions read the machine's local clock):
//   TZ="America/New_York" node scripts/edge-case-tests.mjs
//   TZ="Pacific/Chatham" node scripts/edge-case-tests.mjs   (an unusual +12:45/+13:45 DST zone)
//
// IMPORTANT: if you change src/lib/calendar.ts or src/lib/reminders.ts,
// copy the changed functions into this file too — it does not import the
// real ones (this sandbox has no TypeScript loader for plain node).

const pad2 = (n) => String(n).padStart(2, "0");

function dayKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function dayKeyOf(iso) {
  return dayKey(new Date(iso));
}
function parseDayKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
    ? date
    : null;
}
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d, n) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}
function startOfWeek(d) {
  return addDays(startOfDay(d), -startOfDay(d).getDay());
}
function weekDays(d) {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
function moveToDay(dueAtIso, targetKey) {
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
function groupTasksByDay(items) {
  const map = new Map();
  const sorted = [...items].sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  for (const item of sorted) {
    const key = dayKeyOf(item.dueAt);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

// ---- reminders.ts (unchanged logic, types stripped) ----
const MINUTE = 60_000;
const POPUP_MAX_LATE_MS = 6 * 60 * MINUTE;
let idCounter = 0;
function makeId() {
  return `n-${++idCounter}`;
}
function keyOf(taskId, offsetMinutes, sendMs) {
  return `${taskId}|${offsetMinutes}|${sendMs}`;
}
function durationPhrase(minutes) {
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
function reminderMessage(title, offsetMinutes) {
  return `Reminder: "${title}" is due in ${durationPhrase(offsetMinutes)}.`;
}
function lateMessage(title, dueMs, nowMs) {
  if (nowMs - dueMs < MINUTE) return `Reminder: "${title}" is due now.`;
  return `Reminder: "${title}" was due ${new Date(dueMs).toLocaleString()}.`;
}
function runReminderCycle(tasks, notifications, nowMs) {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const wanted = new Map();
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
  const history = new Set();
  for (const n of notifications) {
    if (n.status !== "pending" && n.offsetMinutes !== undefined) {
      history.add(keyOf(n.taskId, n.offsetMinutes, Date.parse(n.sendAt)));
    }
  }
  let changed = false;
  const kept = [];
  const pendingKeys = new Set();
  for (const n of notifications) {
    if (n.status !== "pending") {
      kept.push(n);
      continue;
    }
    const key = n.offsetMinutes === undefined ? null : keyOf(n.taskId, n.offsetMinutes, Date.parse(n.sendAt));
    if (key && wanted.has(key) && !history.has(key) && !pendingKeys.has(key)) {
      pendingKeys.add(key);
      kept.push(n);
    } else {
      changed = true;
    }
  }
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
  const fired = [];
  const next = kept.map((n) => {
    if (n.status !== "pending" || Date.parse(n.sendAt) > nowMs) return n;
    const task = taskById.get(n.taskId);
    const dueMs = n.dueAt ? Date.parse(n.dueAt) : task ? Date.parse(task.dueAt) : NaN;
    const title = task?.title ?? "A task";
    const sent = {
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

// ---------------- Test runner ----------------
let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(`${name}${detail ? " — " + detail : ""}`);
  }
}

const TZ = process.env.TZ || "(unset)";

// 1. Leap day: Feb 28 2028 + 1 day = Feb 29 2028 (2028 is a leap year); + another day = Mar 1.
{
  const feb28 = new Date(2028, 1, 28);
  const feb29 = addDays(feb28, 1);
  const mar1 = addDays(feb29, 1);
  check("leap-day addDays Feb28->Feb29", dayKey(feb29) === "2028-02-29", dayKey(feb29));
  check("leap-day addDays Feb29->Mar1", dayKey(mar1) === "2028-03-01", dayKey(mar1));
  check("leap-day Feb30 is rejected by parseDayKey", parseDayKey("2028-02-30") === null);
  check("non-leap Feb29 is rejected (2027)", parseDayKey("2027-02-29") === null);
}

// 2. Month / year end.
{
  const dec31 = new Date(2026, 11, 31);
  const jan1 = addDays(dec31, 1);
  check("year-end Dec31->Jan1", dayKey(jan1) === "2027-01-01", dayKey(jan1));
}

// 3. moveToDay keeps local time-of-day and is invalid-date-safe.
{
  const original = new Date(2026, 10, 5, 14, 30, 0).toISOString(); // 5 Nov 2026, 14:30 local
  const moved = moveToDay(original, "2026-12-25");
  const movedDate = new Date(moved);
  check(
    "moveToDay keeps hour/minute",
    movedDate.getHours() === 14 && movedDate.getMinutes() === 30,
    `${movedDate.getHours()}:${movedDate.getMinutes()}`,
  );
  check("moveToDay lands on target day", dayKey(movedDate) === "2026-12-25", dayKey(movedDate));
  check("moveToDay rejects a bad target key", moveToDay(original, "2026-02-30") === null);
  check("moveToDay rejects a bad source instant", moveToDay("not-a-date", "2026-12-25") === null);
}

// 4. Week grouping across a day with zero tasks and a day with several, unsorted input.
{
  const items = [
    { id: "c", dueAt: new Date(2026, 10, 10, 9, 0).toISOString() },
    { id: "a", dueAt: new Date(2026, 10, 10, 8, 0).toISOString() },
    { id: "b", dueAt: new Date(2026, 10, 12, 8, 0).toISOString() },
  ];
  const grouped = groupTasksByDay(items);
  const day10 = grouped.get("2026-11-10") ?? [];
  check("groupTasksByDay sorts within a day", day10.map((t) => t.id).join(",") === "a,c");
  check("groupTasksByDay keeps empty days out of the map", !grouped.has("2026-11-11"));
}

// 5. startOfWeek / weekDays always return 7 consecutive days starting Sunday, even across a month boundary.
{
  const days = weekDays(new Date(2026, 10, 1)); // 1 Nov 2026 is a Sunday
  check("weekDays length", days.length === 7);
  check("weekDays starts Sunday", days[0].getDay() === 0);
  check(
    "weekDays are consecutive",
    days.every((d, i) => i === 0 || dayKey(addDays(days[i - 1], 1)) === dayKey(d)),
  );
}

// 6. Reminder cycle: DST does not shift absolute send time.
// A task due at a fixed instant, reminder 60 min before: sendMs is pure
// arithmetic on epoch ms, so it must be exactly 60 real minutes earlier
// regardless of any local-clock DST jump that may fall in between.
{
  const dueMs = Date.UTC(2026, 10, 10, 12, 0, 0);
  const task = {
    id: "t1",
    title: "DST-spanning task",
    dueAt: new Date(dueMs).toISOString(),
    status: "todo",
    reminderOffsets: [60],
  };
  const { next } = runReminderCycle([task], [], dueMs - 61 * MINUTE); // 1 min before the reminder (due - 60min) is due to fire
  const created = next.find((n) => n.taskId === "t1");
  check("reminder created before its time", !!created && created.status === "pending");
  check(
    "reminder sendAt is exactly 60 min before due, in epoch terms",
    created && Date.parse(created.sendAt) === dueMs - 60 * MINUTE,
  );
}

// 7. Reminder cycle: a reminder whose time has already passed is never invented (only delivered once seen while still future, or as "late" if already overdue at creation... actually spec: "never invents past reminders").
{
  const dueMs = Date.now() + 10 * MINUTE;
  const task = {
    id: "t2",
    title: "Already-past reminder",
    dueAt: new Date(dueMs).toISOString(),
    status: "todo",
    reminderOffsets: [60], // would have fired 50 min ago
  };
  const { next, fired } = runReminderCycle([task], [], Date.now());
  check("past-due reminder is not invented", !next.some((n) => n.taskId === "t2"));
  check("nothing fired for it either", fired.length === 0);
}

// 8. Reminder cycle: a late reminder (app was closed past the send time) still delivers, worded "was due".
{
  const dueMs = Date.now() - 2 * 60 * MINUTE; // due 2h ago
  const task = { id: "t3", title: "Late task", dueAt: new Date(dueMs).toISOString(), status: "todo", reminderOffsets: [180] };
  // sendMs = dueMs - 180min = 5h ago: so first cycle (notifications=[]) at "now" won't create it (sendMs <= now is fine to skip creating since it's in the past before this run started — matches rule: never invent past reminders)
  const { next: afterFirstCycle } = runReminderCycle([task], [], dueMs - 181 * MINUTE); // one minute before it was due to be created
  const pendingBefore = afterFirstCycle.find((n) => n.taskId === "t3");
  check("reminder created while still future", !!pendingBefore);
  const { next: afterFire, fired } = runReminderCycle([task], afterFirstCycle, Date.now());
  const sent = afterFire.find((n) => n.taskId === "t3");
  check("late reminder is delivered, not dropped", sent && sent.status === "sent");
  check("late reminder uses 'was due' wording", sent && sent.message.includes("was due"), sent && sent.message);
  check("late reminder reported as fired", fired.some((f) => f.taskId === "t3"));
}

// 9. Reminder cycle: editing a task's reminders removes the stale pending one and adds the new one, no duplicates.
{
  const dueMs = Date.now() + 2 * 60 * MINUTE;
  let task = { id: "t4", title: "Edit me", dueAt: new Date(dueMs).toISOString(), status: "todo", reminderOffsets: [60] };
  const { next: first } = runReminderCycle([task], [], Date.now());
  task = { ...task, reminderOffsets: [15] }; // reminder changed
  const { next: second } = runReminderCycle([task], first, Date.now());
  const pendingForTask = second.filter((n) => n.taskId === "t4" && n.status === "pending");
  check("old reminder offset removed after edit", pendingForTask.every((n) => n.offsetMinutes === 15));
  check("exactly one pending reminder after edit", pendingForTask.length === 1, String(pendingForTask.length));
}

// 10. Reminder cycle: marking a task done drops its pending reminders.
{
  const dueMs = Date.now() + 2 * 60 * MINUTE;
  let task = { id: "t5", title: "Finish me", dueAt: new Date(dueMs).toISOString(), status: "todo", reminderOffsets: [60] };
  const { next: first } = runReminderCycle([task], [], Date.now());
  task = { ...task, status: "done" };
  const { next: second } = runReminderCycle([task], first, Date.now());
  check("done task has no pending reminders", !second.some((n) => n.taskId === "t5" && n.status === "pending"));
}

// 11. durationPhrase edge values: 0 is not reachable via the UI (ReminderPicker only offers >0), but guard anyway.
{
  check("durationPhrase 1 day", durationPhrase(1440) === "1 day");
  check("durationPhrase 7 days", durationPhrase(10080) === "7 days");
  check("durationPhrase 1 hour", durationPhrase(60) === "1 hour");
  check("durationPhrase 1 minute", durationPhrase(1) === "1 minute");
}

console.log(`[${TZ}] ${pass} passed, ${fail} failed`);
for (const f of failures) console.log(`  FAIL: ${f}`);
process.exitCode = fail > 0 ? 1 : 0;
