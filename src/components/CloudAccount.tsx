"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
import Link from "next/link";

export default function CloudAccount() {
  const client = getSupabaseClient();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
    setMessage(localStorage.getItem("ast-cloud-sync-status") ?? "");
    const onSyncStatus = (event: Event) => {
      setMessage((event as CustomEvent<string>).detail);
    };
    window.addEventListener("ast-cloud-sync-status", onSyncStatus);
    if (!client) return () => window.removeEventListener("ast-cloud-sync-status", onSyncStatus);
    void client.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("ast-cloud-sync-status", onSyncStatus);
    };
  }, [client]);

  if (!mounted) return <p className="text-sm text-ink-faint">Loading account settings…</p>;

  const signOut = async (clearDevice: boolean) => {
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signOut();
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    if (clearDevice) {
      // For shared computers: the next person must not find this account's data in the browser.
      Object.keys(localStorage).filter((k) => k.startsWith("ast-")).forEach((k) => localStorage.removeItem(k));
      window.location.reload();
      return;
    }
    setMessage("Signed out. This device still keeps its local copy.");
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      {!client ? (
        <p className="text-sm text-ink-light">Add your Supabase project URL and publishable key to <code>.env.local</code>, then restart the app to enable accounts.</p>
      ) : user ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-light">Signed in as <strong className="text-ink">{user.email}</strong>. Changes sync automatically when online.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => signOut(false)} disabled={busy}>Sign out</Button>
            <Button size="sm" variant="secondary" onClick={() => signOut(true)} disabled={busy}>Sign out & clear this device</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-light">You are not signed in. Sign in to sync your study data across devices.</p>
          <Link href="/auth/sign-in">
            <Button size="sm" variant="primary">Sign in & sync</Button>
          </Link>
        </div>
      )}
      {message && <p role="status" className="text-sm text-ink-light">{message}</p>}
      {client && <p className="text-xs text-ink-faint">On first sign-in, this device&apos;s data merges into the account. Switching accounts loads that account&apos;s cloud data and keeps an archive of the current device data. Data remains available locally when offline.</p>}
    </div>
  );
}
