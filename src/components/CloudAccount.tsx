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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const act = async (action: "signIn" | "signUp") => {
    if (!client) return;
    setBusy(true);
    setMessage("");
    try {
      const result = action === "signIn"
        ? await client.auth.signInWithPassword({ email: email.trim(), password })
        : await client.auth.signUp({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (action === "signUp" && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in here.");
      } else {
        setMessage("Signed in. Your local study data is syncing to this account.");
      }
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signOut();
    setMessage(error ? error.message : "Signed out. This device still keeps its local copy.");
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      {!client ? (
        <p className="text-sm text-ink-light">Add your Supabase project URL and publishable key to <code>.env.local</code>, then restart the app to enable accounts.</p>
      ) : user ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-light">Signed in as <strong className="text-ink">{user.email}</strong>. Changes sync automatically when online.</p>
          <Button size="sm" variant="secondary" onClick={signOut} disabled={busy}>Sign out</Button>
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
