"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Enter your email address first.");
      return;
    }

    setSendingReset(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        { redirectTo }
      );

      if (resetError) throw resetError;

      setMessage(
        "Password reset email sent. Check your inbox and open the reset link."
      );
    } catch (err: any) {
      setError(err?.message || "Unable to send password reset email.");
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl sm:p-9">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-400">
            Vendor Invoice
          </p>
          <h1 className="mt-3 text-3xl font-black">Sign In</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to manage your buyers, invoices, and payments.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm font-semibold text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-green-800 bg-green-950/40 p-4 text-sm font-semibold text-green-300">
            {message}
          </div>
        )}

        <form onSubmit={handleSignIn} className="mt-7 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-950"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-bold text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword((current) => !current);
                  setError("");
                  setMessage("");
                }}
                className="text-sm font-bold text-blue-400 hover:text-blue-300"
              >
                Forgot password?
              </button>
            </div>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-950"
            />
          </div>

          {showForgotPassword && (
            <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-4">
              <p className="text-sm font-bold text-white">Reset your password</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Enter your email above, then we&apos;ll send you a secure reset link.
              </p>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={sendingReset}
                className="mt-4 w-full rounded-xl border border-blue-700 bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {sendingReset ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-5 py-3.5 font-black text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-black text-blue-400 hover:text-blue-300">
            Create Account
          </Link>
        </p>

        <div className="mt-5 text-center">
          <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-white">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
