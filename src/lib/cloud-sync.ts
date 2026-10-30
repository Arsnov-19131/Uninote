import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useSubjectStore } from "@/store/subjects";
import { useTopicStore } from "@/store/topics";
import { useTaskStore } from "@/store/tasks";
import { useNoteStore } from "@/store/notes";
import { useNotificationStore } from "@/store/notifications";
import { useResourceStore } from "@/store/resources";
import { useQuizStore } from "@/store/quizzes";
import { useChatStore } from "@/store/chat";
import { useProgressStore } from "@/store/progress";

const stores = [
  useSubjectStore, useTopicStore, useTaskStore, useNoteStore,
  useNotificationStore, useResourceStore, useQuizStore, useChatStore, useProgressStore,
] as const;

type Slice = Record<string, unknown>;
export type CloudSnapshot = Record<string, Slice>;
type IdBaseline = Record<string, Record<string, string[]>>;

export function readLocalSnapshot(): CloudSnapshot {
  return Object.fromEntries(stores.map((store) => {
    const state = store.getState() as unknown as Slice;
    return [store.persist?.getOptions().name ?? "", Object.fromEntries(
      Object.entries(state).filter(([, value]) => Array.isArray(value)),
    )];
  }).filter(([name]) => name));
}

function mergeList(local: unknown, cloud: unknown) {
  if (!Array.isArray(local)) return Array.isArray(cloud) ? cloud : [];
  if (!Array.isArray(cloud)) return local;
  const rows = new Map<string, Record<string, unknown>>();
  for (const item of [...cloud, ...local]) {
    if (!item || typeof item !== "object" || typeof item.id !== "string") continue;
    const row = item as Record<string, unknown>;
    const id = row.id as string;
    const previous = rows.get(id);
    const stamp = String(row.updatedAt ?? row.createdAt ?? row.calculatedAt ?? "");
    const previousStamp = String(previous?.updatedAt ?? previous?.createdAt ?? previous?.calculatedAt ?? "");
    if (!previous || stamp >= previousStamp) rows.set(id, row);
  }
  return [...rows.values()];
}

export function mergeSnapshots(local: CloudSnapshot, cloud: CloudSnapshot): CloudSnapshot {
  const merged: CloudSnapshot = {};
  for (const [key, localSlice] of Object.entries(local)) {
    const cloudSlice = cloud[key] ?? {};
    merged[key] = Object.fromEntries(Object.entries(localSlice).map(([listKey, value]) =>
      [listKey, mergeList(value, cloudSlice[listKey])],
    ));
  }
  return merged;
}

export function createIdBaseline(snapshot: CloudSnapshot): IdBaseline {
  return Object.fromEntries(Object.entries(snapshot).map(([store, slice]) => [store,
    Object.fromEntries(Object.entries(slice).map(([key, value]) => [key,
      Array.isArray(value) ? value.flatMap((item) =>
      item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
        ? [(item as { id: string }).id] : [],
      ) : [],
    ])),
  ]));
}

export function reconcileSnapshots(local: CloudSnapshot, cloud: CloudSnapshot, baseline: IdBaseline | null) {
  if (!baseline) return mergeSnapshots(local, cloud);
  const localNext: CloudSnapshot = {};
  const cloudNext: CloudSnapshot = {};
  for (const store of new Set([...Object.keys(local), ...Object.keys(cloud), ...Object.keys(baseline)])) {
    const localSlice = local[store] ?? {};
    const cloudSlice = cloud[store] ?? {};
    const baselineSlice = baseline[store] ?? {};
    localNext[store] = {};
    cloudNext[store] = {};
    for (const listKey of new Set([...Object.keys(localSlice), ...Object.keys(cloudSlice), ...Object.keys(baselineSlice)])) {
      const localRows = Array.isArray(localSlice[listKey]) ? localSlice[listKey] as unknown[] : [];
      const cloudRows = Array.isArray(cloudSlice[listKey]) ? cloudSlice[listKey] as unknown[] : [];
      const known = new Set(baselineSlice[listKey] ?? []);
      const ids = (rows: unknown[]) => new Set(rows.flatMap((item) =>
        item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
          ? [(item as { id: string }).id] : [],
      ));
      const localIds = ids(localRows);
      const cloudIds = ids(cloudRows);
      const localDeleted = new Set([...known].filter((id) => !localIds.has(id)));
      const cloudDeleted = new Set([...known].filter((id) => !cloudIds.has(id)));
      localNext[store][listKey] = localRows.filter((item) => {
        const id = item && typeof item === "object" ? (item as { id?: unknown }).id : undefined;
        return typeof id !== "string" || !cloudDeleted.has(id);
      });
      cloudNext[store][listKey] = cloudRows.filter((item) => {
        const id = item && typeof item === "object" ? (item as { id?: unknown }).id : undefined;
        return typeof id !== "string" || !localDeleted.has(id);
      });
    }
  }
  return mergeSnapshots(localNext, cloudNext);
}

export function emptySnapshot(): CloudSnapshot {
  return Object.fromEntries(stores.map((store) => {
    const name = store.persist?.getOptions().name ?? "";
    const arrays = Object.fromEntries(Object.entries(store.getState() as unknown as Slice)
      .filter(([, value]) => Array.isArray(value)).map(([key]) => [key, []]));
    return [name, arrays];
  }).filter(([name]) => name));
}

export function applySnapshot(snapshot: CloudSnapshot) {
  for (const store of stores) {
    const name = store.persist?.getOptions().name;
    if (name && snapshot[name]) {
      const target = store as unknown as { setState: (state: Slice) => void };
      target.setState(snapshot[name]);
    }
  }
}

export async function loadCloud(client: SupabaseClient, user: User) {
  const { data, error } = await client.from("user_app_data")
    .select("data").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return (data?.data ?? null) as CloudSnapshot | null;
}

function readBaseline(userId: string): IdBaseline | null {
  try {
    const saved = localStorage.getItem(`ast-cloud-baseline-${userId}`);
    return saved ? (JSON.parse(saved) as IdBaseline) : null;
  } catch {
    localStorage.removeItem(`ast-cloud-baseline-${userId}`);
    return null;
  }
}

const MAX_SAVE_ATTEMPTS = 4;
let saveQueue: Promise<unknown> = Promise.resolve();

/**
 * Brings this device and the account's cloud copy to the same state, safely:
 *  1. read the cloud copy and its version stamp (updated_at);
 *  2. merge it with this device's data (newest edit wins per item, deletions are respected);
 *  3. show the merged result on this device;
 *  4. write it back ONLY if nobody else changed the cloud copy in the meantime. If someone did,
 *     start again from step 1, so another device's changes are never overwritten.
 * Calls are queued so two syncs in the same tab never overlap. It writes nothing when there is nothing new.
 */
export function saveCloudSnapshot(client: SupabaseClient, user: User): Promise<void> {
  const run = saveQueue.then(() => syncOnce(client, user));
  saveQueue = run.catch(() => undefined);
  return run;
}

async function syncOnce(client: SupabaseClient, user: User): Promise<void> {
  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
    const { data: row, error } = await client.from("user_app_data")
      .select("data, updated_at").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    const cloud = ((row?.data ?? {}) as CloudSnapshot) || {};

    // Steps 2 and 3 run without waiting, so an edit made on this device cannot slip in between.
    const local = readLocalSnapshot();
    const merged = reconcileSnapshots(local, cloud, readBaseline(user.id));
    if (JSON.stringify(merged) !== JSON.stringify(local)) applySnapshot(merged);
    const result = readLocalSnapshot();

    const nothingNew = row && JSON.stringify(result) === JSON.stringify(cloud);
    if (!nothingNew) {
      const stamp = new Date().toISOString();
      if (row) {
        const { data: updated, error: updateError } = await client.from("user_app_data")
          .update({ data: result, updated_at: stamp })
          .eq("user_id", user.id).eq("updated_at", row.updated_at)
          .select("user_id");
        if (updateError) throw updateError;
        if (!updated || updated.length === 0) continue; // changed elsewhere: merge again
      } else {
        const { error: insertError } = await client.from("user_app_data")
          .insert({ user_id: user.id, data: result, updated_at: stamp });
        if (insertError) {
          if (insertError.code === "23505") continue; // another device created it first
          throw insertError;
        }
      }
    }
    localStorage.setItem(`ast-cloud-baseline-${user.id}`, JSON.stringify(createIdBaseline(result)));
    return;
  }
  throw new Error("Cloud data kept changing on another device. It will sync again shortly.");
}
