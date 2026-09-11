"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PaymentRequest = {
  id: string;
  user_id: string;
  plan: "monthly" | "yearly";
  payment_method: "cashapp" | "chime";
  amount: number;
  payment_reference: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminSubscriptionsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/sign-in");
        return;
      }

      // Verify this user is an admin.
      const { data: admin, error: adminError } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!admin) {
        router.replace("/dashboard");
        return;
      }

      const { data, error: requestError } = await supabase
        .from("subscription_payment_requests")
        .select(
          "id, user_id, plan, payment_method, amount, payment_reference, status, submitted_at, reviewed_at"
        )
        .order("submitted_at", { ascending: false });

      if (requestError) throw requestError;

      setRequests(
        (data ?? []).map((request: any) => ({
          id: request.id,
          user_id: request.user_id,
          plan: request.plan,
          payment_method: request.payment_method,
          amount: Number(request.amount || 0),
          payment_reference: request.payment_reference,
          status: request.status,
          submitted_at: request.submitted_at,
          reviewed_at: request.reviewed_at,
        }))
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to load payment requests.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function approveRequest(request: PaymentRequest) {
    const confirmed = window.confirm(
      `Approve this ${request.plan} ${request.payment_method} payment for ${money(
        request.amount
      )}?`
    );

    if (!confirmed) return;

    try {
      setWorkingId(request.id);
      setError("");
      setMessage("");

      const now = new Date();

      const currentSubscriptionResult = await supabase
        .from("account_subscriptions")
        .select("subscription_ends_at")
        .eq("user_id", request.user_id)
        .maybeSingle();

      if (currentSubscriptionResult.error) {
        throw currentSubscriptionResult.error;
      }

      /*
       * If the customer already has paid time remaining,
       * extend from their existing expiration date.
       *
       * Otherwise start from today.
       */
      let startDate = now;

      if (
        currentSubscriptionResult.data?.subscription_ends_at
      ) {
        const existingEnd = new Date(
          currentSubscriptionResult.data.subscription_ends_at
        );

        if (existingEnd.getTime() > now.getTime()) {
          startDate = existingEnd;
        }
      }

      const newEndDate = new Date(startDate);

      if (request.plan === "yearly") {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      } else {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      }

      const { error: subscriptionError } = await supabase
        .from("account_subscriptions")
        .update({
          status: "active",
          plan: request.plan,
          payment_method: request.payment_method,
          subscription_started_at: now.toISOString(),
          subscription_ends_at: newEndDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("user_id", request.user_id);

      if (subscriptionError) {
        throw subscriptionError;
      }

      const { error: requestError } = await supabase
        .from("subscription_payment_requests")
        .update({
          status: "approved",
          reviewed_at: now.toISOString(),
        })
        .eq("id", request.id);

      if (requestError) {
        throw requestError;
      }

      setMessage("Payment approved and subscription activated.");

      await loadRequests();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to approve payment.");
    } finally {
      setWorkingId(null);
    }
  }

  async function rejectRequest(request: PaymentRequest) {
    const confirmed = window.confirm(
      "Are you sure you want to reject this payment request?"
    );

    if (!confirmed) return;

    try {
      setWorkingId(request.id);
      setError("");
      setMessage("");

      const { error: requestError } = await supabase
        .from("subscription_payment_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (requestError) {
        throw requestError;
      }

      setMessage("Payment request rejected.");

      await loadRequests();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to reject payment.");
    } finally {
      setWorkingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="font-semibold text-slate-700">
            Loading subscription payments...
          </p>
        </div>
      </main>
    );
  }

  const pending = requests.filter(
    (request) => request.status === "pending"
  );

  const history = requests.filter(
    (request) => request.status !== "pending"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="font-semibold text-slate-600 hover:text-slate-950"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              Subscription Payments
            </h1>

            <p className="mt-1 text-slate-600">
              Review Cash App and Chime subscription payments.
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 px-5 py-3 text-white">
            <p className="text-xs font-bold uppercase text-slate-400">
              Pending
            </p>

            <p className="text-2xl font-black">
              {pending.length}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl bg-green-50 p-4 font-semibold text-green-700">
            {message}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-black text-slate-950">
            Pending Payments
          </h2>

          <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th className="px-5 py-4 text-left text-xs uppercase">
                    Submitted
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase">
                    User
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase">
                    Plan
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase">
                    Method
                  </th>

                  <th className="px-5 py-4 text-left text-xs uppercase">
                    Reference
                  </th>

                  <th className="px-5 py-4 text-right text-xs uppercase">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-right text-xs uppercase">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {pending.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t border-slate-200"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {formatDate(request.submitted_at)}
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[170px] truncate text-xs font-semibold text-slate-500">
                        {request.user_id}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-bold capitalize text-slate-900">
                      {request.plan}
                    </td>

                    <td className="px-5 py-4 font-bold text-slate-900">
                      {request.payment_method === "cashapp"
                        ? "Cash App"
                        : "Chime"}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {request.payment_reference}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-slate-950">
                      {money(request.amount)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={workingId === request.id}
                          onClick={() => approveRequest(request)}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          disabled={workingId === request.id}
                          onClick={() => rejectRequest(request)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {pending.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center font-semibold text-slate-500"
                    >
                      No pending payments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-black text-slate-950">
            Payment History
          </h2>

          <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-slate-600">
                    Submitted
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-slate-600">
                    Plan
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-slate-600">
                    Method
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-slate-600">
                    Reference
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase text-slate-600">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {history.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t border-slate-200"
                  >
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {formatDate(request.submitted_at)}
                    </td>

                    <td className="px-5 py-4 font-bold capitalize">
                      {request.plan}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {request.payment_method === "cashapp"
                        ? "Cash App"
                        : "Chime"}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {request.payment_reference}
                    </td>

                    <td className="px-5 py-4 text-right font-black">
                      {money(request.amount)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${
                          request.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center font-semibold text-slate-500"
                    >
                      No payment history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}