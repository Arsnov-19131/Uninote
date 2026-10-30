import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppNotification, NotificationStatus } from "@/types";
import { generateId, now } from "@/lib/utils";

interface NotificationStore {
  notifications: AppNotification[];
  addNotification: (taskId: string, message: string, sendAt: string) => AppNotification;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  deleteByTask: (taskId: string) => void;
  /** Replace the whole list in one step. Return the same array to change nothing. */
  update: (fn: (current: AppNotification[]) => AppNotification[]) => void;
  getUnread: () => AppNotification[];
  getAll: () => AppNotification[];
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (taskId, message, sendAt) => {
        const notif: AppNotification = {
          id: generateId(),
          taskId,
          message,
          sendAt,
          channel: "in_app",
          sentAt: null,
          status: "pending",
          read: false,
          createdAt: now(),
        };
        set((s) => ({ notifications: [...s.notifications, notif] }));
        return notif;
      },

      update: (fn) =>
        set((s) => {
          const next = fn(s.notifications);
          return next === s.notifications ? s : { notifications: next };
        }),

      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),

      markAllRead: () =>
        set((s) => ({
          // Only reminders that have fired. A still-pending one must stay unread so it shows a badge when it goes off.
          notifications: s.notifications.map((n) =>
            n.status === "sent" ? { ...n, read: true } : n,
          ),
        })),

      deleteNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        })),

      deleteByTask: (taskId) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.taskId !== taskId),
        })),

      getUnread: () =>
        get()
          .notifications.filter((n) => !n.read)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

      getAll: () =>
        [...get().notifications].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),

      getUnreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    { name: "ast-notifications" },
  ),
);
