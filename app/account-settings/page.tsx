"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        router.replace("/sign-in");
        return;
      }

      setCurrentEmail(user.email || "");
      setNewEmail(user.email || "");
      setLoading(false);
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function updateEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    const email = newEmail.trim();

    if (!email) {
      setError("Enter an email address.");
      return;
    }

    if (email === currentEmail) {
      setError("Enter a different email address.");
      return;
    }

    setSavingEmail(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ email });
      if (updateError) throw updateError;

      setMessage(
        "Email change requested. Check your email for a confirmation message if Supabase requires confirmation."
      );
    } catch (err: any) {
      setError(err?.message || "Unable to update email.");
    } finally {
      setSavingEmail(false);
    }
  }

  async function updatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (err: any) {
      setError(err?.message || "Unable to update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-semibold text-slate-600">Loading account settings...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-5 py-7 sm:px-6">
          <Link href="/dashboard" className="text-sm font-bold text-blue-300 hover:text-blue-200">
            ← Back to Dashboard
          </Link>
          <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-blue-400">
            Vendor Invoice
          </p>
          <h1 className="mt-1 text-3xl font-black">Account Settings</h1>
          <p className="mt-2 text-sm text-slate-400">Signed in as {currentEmail}</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">
            {message}
          </div>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Email Address</h2>
          <p className="mt-1 text-sm text-slate-500">Change the email used to sign in to this account.</p>

          <form onSubmit={updateEmail} className="mt-6 max-w-xl space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <button
              type="submit"
              disabled={savingEmail}
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingEmail ? "Saving..." : "Update Email"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Change Password</h2>
          <p className="mt-1 text-sm text-slate-500">Set a new password for your account.</p>

          <form onSubmit={updatePassword} className="mt-6 max-w-xl space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {savingPassword ? "Updating..." : "Change Password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
