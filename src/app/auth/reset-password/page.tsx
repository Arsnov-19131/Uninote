"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button, Input, Card } from "@/components/ui";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const client = getSupabaseClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full text-center p-8">
          <h1 className="text-2xl font-bold text-ink mb-4">Reset Password</h1>
          <p className="text-sm text-ink-light">
            Supabase configuration is missing. Please check your .env.local file.
          </p>
        </Card>
      </div>
    );
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client.auth.updateUser({
        password: password,
      });
      if (error) throw error;
      setMessage("Password reset successfully! Redirecting to sign-in...");
      router.push("/auth/sign-in");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reset password. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink">Set New Password</h1>
          <p className="text-sm text-ink-light mt-2">Please enter your new password to regain access to your account</p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="relative">
            <Input
              label="New Password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-xs font-medium text-brand hover:text-brand-hover transition-colors"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Updating password..." : "Reset Password"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/sign-in" className="text-sm text-ink-light hover:text-ink transition-colors">
            Return to Sign In
          </Link>
        </div>

        {message && (
          <p role="status" className="mt-4 text-sm text-center text-ink-light">
            {message}
          </p>
        )}
      </Card>
    </div>
  );
}
