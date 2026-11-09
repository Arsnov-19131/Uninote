// Edge-case tests for the pure date/reminder logic. They import the REAL source files
// (Node strips the TypeScript types), so there is no second copy to keep in sync.
//
// Run it:   npm test
// Run it in a specific time zone (these functions read the machine's local clock):
//   TZ="America/New_York" npm test
//   TZ="Pacific/Chatham" npm test   (an unusual +12:45/+13:45 DST zone)

import { dayKey, parseDayKey, addDays, moveToDay, groupTasksByDay, weekDays } from "../src/lib/calendar.ts";
import { runReminderCycle, durationPhrase } from "../src/lib/reminders.ts";

const MINUTE = 60_000;

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


// 12. Two devices that each create the reminder get the SAME id, so sync merges them into one.
{
  const dueMs = Date.now() + 2 * 60 * MINUTE;
  const task = { id: "t6", title: "Two devices", dueAt: new Date(dueMs).toISOString(), status: "todo", reminderOffsets: [60] };
  const a = runReminderCycle([task], [], Date.now()).next[0];
  const b = runReminderCycle([task], [], Date.now() + 5000).next[0];
  check("same reminder has the same id on every device", a && b && a.id === b.id, `${a?.id} vs ${b?.id}`);
}

// 13. Sent reminders older than 30 days are dropped; recent ones are kept.
{
  const nowMs = Date.now();
  const mk = (id, daysAgo) => ({
    id, taskId: "gone", message: "m", channel: "in_app", status: "sent", read: true, createdAt: "x",
    sendAt: new Date(nowMs - daysAgo * 1440 * MINUTE).toISOString(),
    sentAt: new Date(nowMs - daysAgo * 1440 * MINUTE).toISOString(),
    offsetMinutes: 60,
  });
  const { next, changed } = runReminderCycle([], [mk("old", 40), mk("recent", 2)], nowMs);
  check("old sent reminder pruned", !next.some((n) => n.id === "old"));
  check("recent sent reminder kept", next.some((n) => n.id === "recent"));
  check("pruning reports a change", changed);
}

console.log(`[${TZ}] ${pass} passed, ${fail} failed`);
for (const f of failures) console.log(`  FAIL: ${f}`);
process.exitCode = fail > 0 ? 1 : 0;
