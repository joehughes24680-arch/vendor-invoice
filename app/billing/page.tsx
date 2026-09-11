"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Subscription = {
  status: string;
  plan: string | null;
  trial_started_at: string;
  trial_ends_at: string;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  payment_method: string | null;
};

export default function BillingPage() {
  const router = useRouter();

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBilling() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/sign-in");
        return;
      }

      const { data, error } = await supabase
        .from("account_subscriptions")
        .select(
          "status, plan, trial_started_at, trial_ends_at, subscription_started_at, subscription_ends_at, payment_method"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
      }

      if (data) {
        setSubscription(data);
      }

      setLoading(false);
    }

    loadBilling();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-center font-semibold">
          Loading subscription...
        </p>
      </main>
    );
  }

  const trialEnds = subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at)
    : null;

  const now = new Date();

  const trialDaysRemaining = trialEnds
    ? Math.max(
        0,
        Math.ceil(
          (trialEnds.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-5xl">

        <Link
          href="/dashboard"
          className="font-semibold text-slate-600 hover:text-slate-950"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-6 rounded-2xl bg-slate-950 p-8 text-white shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
            VendorInvoice
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Subscription & Billing
          </h1>

          {subscription?.status === "trial" && (
            <div className="mt-6 rounded-xl bg-white/10 p-5">
              <p className="font-semibold text-slate-300">
                Free Trial
              </p>

              <p className="mt-1 text-3xl font-black">
                {trialDaysRemaining} days remaining
              </p>

              {trialEnds && (
                <p className="mt-2 text-sm text-slate-300">
                  Trial ends{" "}
                  {trialEnds.toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {subscription?.status === "active" && (
            <div className="mt-6 rounded-xl bg-green-600/20 p-5">
              <p className="font-semibold text-green-200">
                Subscription Active
              </p>

              <p className="mt-1 text-xl font-black">
                {subscription.plan || "VendorInvoice"}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-black text-slate-950">
            Choose Your Plan
          </h2>

          <p className="mt-2 text-slate-600">
            Continue using VendorInvoice after your free trial.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">

            <PlanCard
              title="Monthly"
              price="$19.99"
              period="/ month"
              plan="monthly"
            />

            <PlanCard
              title="Yearly"
              price="$199"
              period="/ year"
              plan="yearly"
              popular
            />

          </div>
        </div>

        <div className="mt-10 rounded-2xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Payment Methods
          </h2>

          <p className="mt-2 text-slate-600">
            Select a plan first. Payment options will include:
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <PaymentMethod name="PayPal" />
            <PaymentMethod name="Cash App" />
            <PaymentMethod name="Chime" />
          </div>
        </div>

      </div>
    </main>
  );
}

function PlanCard({
  title,
  price,
  period,
  plan,
  popular = false,
}: {
  title: string;
  price: string;
  period: string;
  plan: string;
  popular?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl bg-white p-7 shadow-sm ${
        popular
          ? "border-2 border-blue-600"
          : "border border-slate-200"
      }`}
    >
      {popular && (
        <span className="absolute -top-3 right-5 rounded-full bg-blue-600 px-4 py-1 text-xs font-black text-white">
          BEST VALUE
        </span>
      )}

      <h3 className="text-xl font-black text-slate-950">
        {title}
      </h3>

      <div className="mt-4">
        <span className="text-4xl font-black text-slate-950">
          {price}
        </span>

        <span className="ml-1 font-semibold text-slate-500">
          {period}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-600">
        Full access to VendorInvoice
      </p>

      <button
        type="button"
        onClick={() => {
          window.location.href = `/billing/checkout?plan=${plan}`;
        }}
        className="mt-7 w-full rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-800"
      >
        Choose {title}
      </button>
    </div>
  );
}

function PaymentMethod({ name }: { name: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
      <p className="font-black text-slate-900">
        {name}
      </p>
    </div>
  );
}