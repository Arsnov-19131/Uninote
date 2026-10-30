"use client";

import React, { useEffect, useState } from "react";
import { useNotificationStore } from "@/store/notifications";
import { useTaskStore } from "@/store/tasks";
import {
  Card,
  Button,
} from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import {
  getPermission,
  requestPermission,
  showDeviceNotification,
  type PushPermission,
} from "@/lib/device-notifications";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Smartphone,
  Clock,
} from "lucide-react";

export default function NotificationsPage() {
  const allNotifications = useNotificationStore((s) => s.notifications);

  // Reminders that have fired, newest first. Pending ones are shown separately as "scheduled".
  const notifications = React.useMemo(
    () =>
      allNotifications
        .filter((n) => n.status === "sent")
        .sort(
          (a, b) =>
            new Date(b.sentAt ?? b.sendAt).getTime() - new Date(a.sentAt ?? a.sendAt).getTime(),
        ),
    [allNotifications],
  );
  const scheduled = React.useMemo(
    () =>
      allNotifications
        .filter((n) => n.status === "pending")
        .sort((a, b) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime()),
    [allNotifications],
  );

  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const tasks = useTaskStore((s) => s.tasks);

  const [pushStatus, setPushStatus] = useState<PushPermission>("default");
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Read the real permission after the page loads (it cannot be read on the server).
  useEffect(() => {
    setPushStatus(getPermission());
  }, []);

  const handleRequestPush = async () => {
    setPushStatus(await requestPermission());
  };

  const handleTest = async () => {
    const shown = await showDeviceNotification(
      "AI Study Toolkit",
      "This is a test. Device alerts are working.",
      "test-alert",
    );
    setTestMessage(
      shown
        ? "Test alert sent. If you do not see it, check that Focus or Do Not Disturb is off."
        : "The alert could not be shown. Check your browser's notification settings for this site.",
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            Notification Centre
          </h1>
          <p className="text-sm text-ink-light">
            Reminders for upcoming assignments, exams, and study blocks.
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <Button size="sm" variant="secondary" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" /> Mark All as Read
          </Button>
        )}
      </div>

      {/* Device alerts */}
      <Card className="p-4 bg-gradient-to-r from-sky-50 to-white border-sky-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h3 className="font-heading text-sm font-bold text-ink">
                Device alerts
              </h3>
              <p className="text-xs text-ink-light leading-relaxed max-w-xl">
                Get a pop-up on this device when a reminder is due. Alerts arrive while the app is
                open in a browser tab or window. On iPhone, add the app to your Home Screen first.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {pushStatus === "granted" ? (
              <>
                <span className="text-xs font-semibold text-emerald-700">Alerts on ✓</span>
                <Button size="sm" variant="secondary" onClick={handleTest}>
                  Send a test alert
                </Button>
              </>
            ) : pushStatus === "default" ? (
              <Button size="sm" onClick={handleRequestPush}>
                Turn on alerts
              </Button>
            ) : null}
          </div>
        </div>

        {pushStatus === "denied" && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Alerts are blocked for this site. Reminders will still appear on this page. To get
              pop-ups, allow notifications for this site in your browser settings, then reload.
            </span>
          </p>
        )}
        {pushStatus === "unsupported" && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This browser cannot show device alerts. Reminders will still appear on this page.
            </span>
          </p>
        )}
        {testMessage && pushStatus === "granted" && (
          <p role="status" className="mt-3 text-xs text-ink-light">
            {testMessage}
          </p>
        )}
      </Card>

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-ink-light bg-surface border border-border rounded-xl px-3.5 py-3">
          <Clock className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p>
            <strong>
              {scheduled.length} reminder{scheduled.length === 1 ? "" : "s"} scheduled.
            </strong>{" "}
            Next: {formatDateTime(scheduled[0].sendAt)}
            {tasks.find((t) => t.id === scheduled[0].taskId)
              ? ` for "${tasks.find((t) => t.id === scheduled[0].taskId)?.title}"`
              : ""}
            . Change reminders by editing the task in the Planner.
          </p>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="py-12 text-center bg-surface rounded-xl border border-border text-xs text-ink-faint">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No reminders have gone off yet. When a reminder is due, it appears here.
          </div>
        ) : (
          notifications.map((notif) => {
            const task = tasks.find((t) => t.id === notif.taskId);
            return (
              <div
                key={notif.id}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
                  notif.read ? "bg-paper border-border" : "bg-surface border-sky-300 shadow-xs"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      notif.read ? "bg-transparent" : "bg-sky-500"
                    }`}
                  />
                  <div className="space-y-0.5 min-w-0">
                    <p
                      className={`text-xs sm:text-sm ${
                        notif.read ? "text-ink-light" : "text-ink font-semibold"
                      }`}
                    >
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-ink-faint">
                      <span>{formatDateTime(notif.sentAt ?? notif.sendAt)}</span>
                      {task && <span className="bg-sidebar px-1.5 py-0.2 rounded font-medium">Task: {task.title}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!notif.read && (
                    <button
                      onClick={() => markRead(notif.id)}
                      className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-sidebar"
                      title="Mark as Read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="p-1.5 rounded-lg text-ink-faint hover:text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
