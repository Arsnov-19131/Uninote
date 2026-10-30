"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { applySnapshot, createIdBaseline, emptySnapshot, loadCloud, readLocalSnapshot, reconcileSnapshots, saveCloudSnapshot, type CloudSnapshot } from "@/lib/cloud-sync";
import { useSubjectStore } from "@/store/subjects";
import { useTopicStore } from "@/store/topics";
import { useTaskStore } from "@/store/tasks";
import { useNoteStore } from "@/store/notes";
import { useNotificationStore } from "@/store/notifications";
import { useResourceStore } from "@/store/resources";
import { useQuizStore } from "@/store/quizzes";
import { useChatStore } from "@/store/chat";
import { useProgressStore } from "@/store/progress";

const stores = [useSubjectStore, useTopicStore, useTaskStore, useNoteStore,
  useNotificationStore, useResourceStore, useQuizStore, useChatStore, useProgressStore];

function setSyncStatus(message: string) {
  localStorage.setItem("ast-cloud-sync-status", message);
  window.dispatchEvent(new CustomEvent("ast-cloud-sync-status", { detail: message }));
}

export default function CloudSync() {
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    let activeUserId: string | null = null;
    let loading = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sequence = 0;

    const hydrate = async (userId: string | null) => {
      const current = ++sequence;
      activeUserId = userId;
      if (!userId) {
        setSyncStatus("Signed out; this device keeps its local data.");
        return;
      }
      loading = true;
      setSyncStatus("Syncing your study data…");
      try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error) throw error;
        if (!user || user.id !== userId || current !== sequence) return;
        const cloud = await loadCloud(client, user);
        if (current !== sequence) return;
        const previousUserId = localStorage.getItem("ast-cloud-user");
        let snapshot: CloudSnapshot;
        if (previousUserId && previousUserId !== user.id) {
          // Keep an exportable local snapshot for the previous account, and
          // never merge one person's browser data into another person's row.
          localStorage.setItem(`ast-cloud-backup-${previousUserId}-${Date.now()}`, JSON.stringify(readLocalSnapshot()));
          snapshot = { ...emptySnapshot(), ...(cloud ?? {}) };
        } else {
          const savedBaseline = localStorage.getItem(`ast-cloud-baseline-${user.id}`);
          let baseline: ReturnType<typeof createIdBaseline> | null = null;
          if (savedBaseline) {
            try { baseline = JSON.parse(savedBaseline) as ReturnType<typeof createIdBaseline>; }
            catch { localStorage.removeItem(`ast-cloud-baseline-${user.id}`); }
          }
          snapshot = reconcileSnapshots(readLocalSnapshot(), cloud ?? {}, baseline);
        }
        applySnapshot(snapshot);
        localStorage.setItem("ast-cloud-user", user.id);
        if (current === sequence) await saveCloudSnapshot(client, user);
        if (current === sequence) setSyncStatus("Synced to your account.");
      } catch (error) {
        console.error("Cloud sync could not load your data.", error);
        if (current === sequence) setSyncStatus("Cloud sync failed. Check your connection and Supabase setup.");
      } finally {
        if (current === sequence) loading = false;
      }
    };

    const scheduleSave = () => {
      if (!activeUserId || loading) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const userId = activeUserId;
        if (!userId) return;
        if (!navigator.onLine) {
          setSyncStatus("Offline; your changes will sync when you're back online.");
          return;
        }
        try {
          // The session is read from this device; the database rejects writes from anyone else anyway.
          const { data: { session }, error } = await client.auth.getSession();
          if (error) throw error;
          if (session?.user.id === userId) {
            await saveCloudSnapshot(client, session.user);
            setSyncStatus("Synced to your account.");
          }
        } catch (error) {
          console.error("Cloud sync could not save your data.", error);
          setSyncStatus("Cloud sync failed. Check your connection and Supabase setup.");
        }
      }, 800);
    };

    const unsubscribers = stores.map((store) => store.subscribe(scheduleSave));
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== activeUserId) {
        window.setTimeout(() => void hydrate(session?.user.id ?? null), 0);
      }
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (error) console.error("Could not check your sign-in status.", error);
      void hydrate(data.session?.user.id ?? null);
    });
    const reconnect = () => {
      if (navigator.onLine && activeUserId) void hydrate(activeUserId);
    };
    window.addEventListener("online", reconnect);

    // Pick up changes made on other devices: when this tab becomes visible again, and once a minute while it is.
    const pull = () => {
      if (!activeUserId || loading || !navigator.onLine || document.visibilityState !== "visible") return;
      scheduleSave();
    };
    const onVisible = () => pull();
    document.addEventListener("visibilitychange", onVisible);
    const pullTimer = window.setInterval(pull, 60_000);

    return () => {
      sequence++;
      clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      subscription.unsubscribe();
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(pullTimer);
    };
  }, []);

  return null;
}
