"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PaymentMethod = "paypal" | "cashapp" | "chime";

export default function BillingCheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100">
          <p className="font-semibold text-slate-600">
            Loading checkout...
          </p>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();

  const requestedPlan = searchParams.get("plan");

  const plan: "monthly" | "yearly" =
    requestedPlan === "yearly" ? "yearly" : "monthly";

  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethod | null>(null);

  const isYearly = plan === "yearly";

  const planName = isYearly
    ? "Vendor Invoice Yearly"
    : "Vendor Invoice Monthly";

  const price = isYearly ? 199 : 19.99;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/billing"
          className="font-semibold text-slate-600 hover:text-slate-950"
        >
          ← Back to Billing
        </Link>

        <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            Vendor Invoice
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Complete Your Subscription
          </h1>

          <p className="mt-2 text-slate-600">
            Choose how you would like to pay.
          </p>

          <div className="mt-7 rounded-xl bg-slate-950 p-6 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-300">
                  Selected Plan
                </p>

                <p className="mt-1 text-xl font-black">
                  {planName}
                </p>
              </div>

              <div className="text-right">
                <p className="text-3xl font-black">
                  ${price.toFixed(2)}
                </p>

                <p className="text-sm font-semibold text-slate-300">
                  {isYearly ? "per year" : "per month"}
                </p>
              </div>
            </div>
          </div>

          <h2 className="mt-8 text-xl font-black text-slate-950">
            Payment Method
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <PaymentButton
              name="PayPal"
              description="Automatic"
              selected={selectedMethod === "paypal"}
              onClick={() => setSelectedMethod("paypal")}
            />

            <PaymentButton
              name="Cash App"
              description="Manual Approval"
              selected={selectedMethod === "cashapp"}
              onClick={() => setSelectedMethod("cashapp")}
            />

            <PaymentButton
              name="Chime"
              description="Manual Approval"
              selected={selectedMethod === "chime"}
              onClick={() => setSelectedMethod("chime")}
            />
          </div>

          {selectedMethod === "paypal" && (
            <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
              <h3 className="text-lg font-black text-slate-950">
                Pay with PayPal
              </h3>

              <p className="mt-2 text-sm font-medium text-slate-600">
                PayPal automatic subscriptions will be connected later.
              </p>

              <button
                type="button"
                disabled
                className="mt-5 w-full cursor-not-allowed rounded-xl bg-blue-400 px-5 py-3 font-black text-white"
              >
                PayPal Coming Soon
              </button>
            </div>
          )}

          {selectedMethod === "cashapp" && (
            <ManualPaymentBox
              plan={plan}
              title="Pay with Cash App"
              method="cashapp"
              displayMethod="Cash App"
              amount={price}
            />
          )}

          {selectedMethod === "chime" && (
            <ManualPaymentBox
              plan={plan}
              title="Pay with Chime"
              method="chime"
              displayMethod="Chime"
              amount={price}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function PaymentButton({
  name,
  description,
  selected,
  onClick,
}: {
  name: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-5 text-left transition ${
        selected
          ? "border-blue-600 bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-400"
      }`}
    >
      <p className="font-black text-slate-950">
        {name}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {description}
      </p>
    </button>
  );
}

function ManualPaymentBox({
  plan,
  title,
  method,
  displayMethod,
  amount,
}: {
  plan: "monthly" | "yearly";
  title: string;
  method: "cashapp" | "chime";
  displayMethod: string;
  amount: number;
}) {
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submitPayment() {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const cleanReference = reference.trim();

      if (!cleanReference) {
        throw new Error(
          "Please enter your payment reference or confirmation."
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const { error: insertError } = await supabase
        .from("subscription_payment_requests")
        .insert({
          user_id: user.id,
          plan,
          payment_method: method,
          amount,
          payment_reference: cleanReference,
          status: "pending",
        });

      if (insertError) throw insertError;

      setReference("");

      setSuccess(
        "Payment submitted successfully. Your subscription will be activated after approval."
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to submit your payment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h3 className="text-lg font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm font-medium text-slate-600">
        Send exactly:
      </p>

      <p className="mt-1 text-3xl font-black text-slate-950">
        ${amount.toFixed(2)}
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {displayMethod} Payment Information
        </p>

        <p className="mt-2 font-semibold text-slate-800">
          Payment instructions will appear here.
        </p>
      </div>

      <div className="mt-5">
        <label className="text-sm font-bold text-slate-700">
          Payment Reference / Confirmation
        </label>

        <input
          type="text"
          value={reference}
          onChange={(event) =>
            setReference(event.target.value)
          }
          placeholder="Enter payment reference"
          disabled={submitting}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
          {success}
        </div>
      )}

      <button
        type="button"
        onClick={submitPayment}
        disabled={submitting || !reference.trim()}
        className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitting
          ? "Submitting..."
          : "Submit Payment for Approval"}
      </button>
    </div>
  );
}