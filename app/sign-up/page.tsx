"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      if (data.session) {
        window.location.href = "/dashboard";
        return;
      }

      setMessage(
        "Account created. Check your email to confirm your account, then sign in."
      );

      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Vendor Invoice
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Create Account
          </h1>

          <p className="mt-2 text-sm font-medium text-slate-600">
            Create your own account to manage your buyers and invoices.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-800">
            {message}
          </div>
        )}

        <form onSubmit={handleSignUp} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter password again"
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-medium text-slate-600">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-bold text-blue-700 hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}