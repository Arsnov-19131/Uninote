"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button, Input, Card } from "@/components/ui";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const client = getSupabaseClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full text-center p-8">
          <h1 className="text-2xl font-bold text-ink mb-4">Sign In</h1>
          <p className="text-sm text-ink-light">
            Supabase configuration is missing. Please check your .env.local file.
          </p>
        </Card>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.session) {
        setMessage("Sign-in failed. Please check your credentials.");
      } else {
        setMessage("Signed in successfully! Redirecting...");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage("Please enter your email first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setMessage("Password reset email sent! Please check your inbox.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink">Welcome Back</h1>
          <p className="text-sm text-ink-light mt-2">Sign in to sync your study data</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={busy}
              className="text-xs font-medium text-brand hover:text-brand-hover transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-ink-light">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="text-brand font-medium hover:underline">
              Create one
            </Link>
          </p>
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
