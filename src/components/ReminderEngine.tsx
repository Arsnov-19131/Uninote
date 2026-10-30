"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/store/tasks";
import { useNotificationStore } from "@/store/notifications";
import { POPUP_MAX_LATE_MS, runReminderCycle } from "@/lib/reminders";
import { registerServiceWorker, showDeviceNotification } from "@/lib/device-notifications";
import type { AppNotification } from "@/types";

const CHECK_EVERY_MS = 30_000;

/*
  Runs for as long as the app is open. It keeps reminders in step with the Planner and fires the
  ones that are due: they appear in the Notification Centre and, if allowed, as a device notification.
  It renders nothing. (Reminders while the app is closed need a server; that comes with the login task.)
*/
export default function ReminderEngine() {
  useEffect(() => {
    void registerServiceWorker();

    const cycle = () => {
      // Never reconcile before saved data has loaded, or reminders for real tasks could be dropped.
      if (!useTaskStore.persist.hasHydrated() || !useNotificationStore.persist.hasHydrated()) {
        return;
      }

      let fired: AppNotification[] = [];
      useNotificationStore.getState().update((current) => {
        const result = runReminderCycle(useTaskStore.getState().tasks, current, Date.now());
        fired = result.fired;
        return result.next;
      });

      const nowMs = Date.now();
      for (const n of fired) {
        if (nowMs - Date.parse(n.sendAt) <= POPUP_MAX_LATE_MS) {
          void showDeviceNotification("AI Study Toolkit", n.message, n.id);
        }
      }
    };

    cycle();
    const timer = window.setInterval(cycle, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") cycle();
    };
    document.addEventListener("visibilitychange", onVisible);
    const stopTasks = useTaskStore.subscribe(cycle);
    const stopTaskHydration = useTaskStore.persist.onFinishHydration(cycle);
    const stopNotifHydration = useNotificationStore.persist.onFinishHydration(cycle);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      stopTasks();
      stopTaskHydration();
      stopNotifHydration();
    };
  }, []);

  return null;
}
