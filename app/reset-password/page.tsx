"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setReady(Boolean(data.session));
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Unable to update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl sm:p-9">
        <p className="text-center text-sm font-black uppercase tracking-[0.2em] text-blue-400">
          Vendor Invoice
        </p>
        <h1 className="mt-3 text-center text-3xl font-black">Reset Password</h1>

        {error && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm font-semibold text-red-300">
            {error}
          </div>
        )}

        {success ? (
          <div className="mt-7">
            <div className="rounded-2xl border border-green-800 bg-green-950/40 p-5 text-center">
              <h2 className="font-black text-green-300">Password updated</h2>
              <p className="mt-2 text-sm text-slate-300">
                Your new password is ready to use.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="mt-5 block w-full rounded-xl bg-blue-600 px-5 py-3.5 text-center font-black text-white hover:bg-blue-500"
            >
              Continue to Dashboard
            </Link>
          </div>
        ) : ready ? (
          <form onSubmit={updatePassword} className="mt-7 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-950"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-950"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 px-5 py-3.5 font-black text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : (
          <div className="mt-7 rounded-2xl border border-yellow-800 bg-yellow-950/30 p-5 text-sm text-yellow-200">
            Open this page using the password reset link sent to your email. If the link expired, request a new one from the sign-in page.
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/sign-in" className="text-sm font-bold text-blue-400 hover:text-blue-300">
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
