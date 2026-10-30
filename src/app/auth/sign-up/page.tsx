"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button, Input, Card } from "@/components/ui";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
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
          <h1 className="text-2xl font-bold text-ink mb-4">Create Account</h1>
          <p className="text-sm text-ink-light">
            Supabase configuration is missing. Please check your .env.local file.
          </p>
        </Card>
      </div>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.session) {
        setMessage("Account created! Please check your email to confirm your account before signing in.");
      } else {
        setMessage("Account created successfully! Redirecting...");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink">Join Us</h1>
          <p className="text-sm text-ink-light mt-2">Create an account to sync your study data</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
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
            {busy ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-ink-light">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="text-brand font-medium hover:underline">
              Sign in
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
