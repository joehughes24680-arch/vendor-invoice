"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Buyer = {
  id: string;
  name: string;
};

type Invoice = {
  id: string;
  vendor_id: string;
  subtotal: number;
};

type Payment = {
  id: string;
  vendor_id: string;
  amount: number;
};

type ProductRate = {
  id: string;
  vendor_id: string;
};

type BuyerSummary = {
  buyer_id: string;
  buyer_name: string;
  product_count: number;
  total_invoiced: number;
  total_paid: number;
  balance: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

export default function DashboardPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [productRates, setProductRates] = useState<ProductRate[]>([]);

  const [buyerName, setBuyerName] = useState("");

  const [editingBuyerId, setEditingBuyerId] = useState<string | null>(
    null
  );
  const [editingBuyerName, setEditingBuyerName] = useState("");

  const [loading, setLoading] = useState(true);
  const [addingBuyer, setAddingBuyer] = useState(false);
  const [savingBuyer, setSavingBuyer] = useState(false);
  const [deletingBuyerId, setDeletingBuyerId] = useState<string | null>(
    null
  );

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

      setUserId(user.id);
      setUserEmail(user.email || "");

      await loadDashboard(user.id);

      if (mounted) {
        setAuthChecking(false);
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        router.replace("/sign-in");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function loadDashboard(currentUserId: string) {
    if (!currentUserId) return;

    try {
      setLoading(true);
      setError("");

      const [
        buyerResult,
        invoiceResult,
        paymentResult,
        rateResult,
      ] = await Promise.all([
        supabase
          .from("vendors")
          .select("id, name")
          .eq("user_id", currentUserId)
          .eq("active", true)
          .order("name", { ascending: true }),

        supabase
          .from("invoices")
          .select("id, vendor_id, subtotal")
          .eq("user_id", currentUserId),

        supabase
          .from("payments")
          .select("id, vendor_id, amount")
          .eq("user_id", currentUserId),

        supabase
          .from("vendor_product_rates")
          .select("id, vendor_id")
          .eq("user_id", currentUserId),
      ]);

      if (buyerResult.error) {
  console.error("VENDORS ERROR:", buyerResult.error);
  throw buyerResult.error;
}

if (invoiceResult.error) {
  console.error("INVOICES ERROR:", invoiceResult.error);
  throw invoiceResult.error;
}

if (paymentResult.error) {
  console.error("PAYMENTS ERROR:", paymentResult.error);
  throw paymentResult.error;
}

if (rateResult.error) {
  console.error("PRODUCT RATES ERROR:", rateResult.error);
  throw rateResult.error;
}

      setBuyers(
        (buyerResult.data ?? []).map((buyer) => ({
          id: buyer.id,
          name: buyer.name,
        }))
      );

      setInvoices(
        (invoiceResult.data ?? []).map((invoice) => ({
          id: invoice.id,
          vendor_id: invoice.vendor_id,
          subtotal: Number(invoice.subtotal || 0),
        }))
      );

      setPayments(
        (paymentResult.data ?? []).map((payment) => ({
          id: payment.id,
          vendor_id: payment.vendor_id,
          amount: Number(payment.amount || 0),
        }))
      );

      setProductRates(
        (rateResult.data ?? []).map((rate) => ({
          id: rate.id,
          vendor_id: rate.vendor_id,
        }))
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to load your buyers.");
    } finally {
      setLoading(false);
    }
  }

  const buyerSummaries = useMemo<BuyerSummary[]>(() => {
    return buyers.map((buyer) => {
      const buyerInvoices = invoices.filter(
        (invoice) => invoice.vendor_id === buyer.id
      );

      const buyerPayments = payments.filter(
        (payment) => payment.vendor_id === buyer.id
      );

      const buyerRates = productRates.filter(
        (rate) => rate.vendor_id === buyer.id
      );

      const totalInvoiced = buyerInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.subtotal || 0),
        0
      );

      const totalPaid = buyerPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );

      return {
        buyer_id: buyer.id,
        buyer_name: buyer.name,
        product_count: buyerRates.length,
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        balance: totalInvoiced - totalPaid,
      };
    });
  }, [buyers, invoices, payments, productRates]);

  const totals = useMemo(() => {
    const totalInvoiced = buyerSummaries.reduce(
      (sum, buyer) => sum + buyer.total_invoiced,
      0
    );

    const totalPaid = buyerSummaries.reduce(
      (sum, buyer) => sum + buyer.total_paid,
      0
    );

    return {
      buyers: buyerSummaries.length,
      invoiced: totalInvoiced,
      paid: totalPaid,
      balance: totalInvoiced - totalPaid,
    };
  }, [buyerSummaries]);

  async function addBuyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    const name = buyerName.trim();

    if (!name) {
      setError("Enter a buyer name.");
      return;
    }

    if (!userId) {
      setError("Your session could not be found. Please sign in again.");
      return;
    }

    setAddingBuyer(true);

    try {
      const { error: insertError } = await supabase
        .from("vendors")
        .insert({
          name,
          user_id: userId,
          active: true,
        });

      if (insertError) throw insertError;

      setBuyerName("");
      setMessage("Buyer added successfully.");

      await loadDashboard(userId);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to add buyer.");
    } finally {
      setAddingBuyer(false);
    }
  }

  function startEditingBuyer(buyer: BuyerSummary) {
    setEditingBuyerId(buyer.buyer_id);
    setEditingBuyerName(buyer.buyer_name);
    setError("");
    setMessage("");
  }

  function cancelEditingBuyer() {
    setEditingBuyerId(null);
    setEditingBuyerName("");
  }

  async function saveBuyerName() {
    if (!editingBuyerId || !userId) return;

    const name = editingBuyerName.trim();

    if (!name) {
      setError("Buyer name cannot be empty.");
      return;
    }

    setSavingBuyer(true);
    setError("");
    setMessage("");

    try {
      const { error: updateError } = await supabase
        .from("vendors")
        .update({ name })
        .eq("id", editingBuyerId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      cancelEditingBuyer();
      setMessage("Buyer updated successfully.");

      await loadDashboard(userId);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to update buyer.");
    } finally {
      setSavingBuyer(false);
    }
  }

  async function deleteBuyer(buyer: BuyerSummary) {
    if (!userId) return;

    const confirmed = window.confirm(
      `Delete ${buyer.buyer_name}?\n\nThis will permanently delete this buyer, their invoices, payments, and product percentages.`
    );

    if (!confirmed) return;

    setDeletingBuyerId(buyer.buyer_id);
    setError("");
    setMessage("");

    try {
      const { data: invoiceData, error: invoiceLookupError } =
        await supabase
          .from("invoices")
          .select("id")
          .eq("vendor_id", buyer.buyer_id)
          .eq("user_id", userId);

      if (invoiceLookupError) throw invoiceLookupError;

      const invoiceIds = (invoiceData ?? []).map(
        (invoice) => invoice.id
      );

      const { error: paymentDeleteError } = await supabase
        .from("payments")
        .delete()
        .eq("vendor_id", buyer.buyer_id)
        .eq("user_id", userId);

      if (paymentDeleteError) throw paymentDeleteError;

      if (invoiceIds.length > 0) {
        const { error: itemDeleteError } = await supabase
          .from("invoice_items")
          .delete()
          .in("invoice_id", invoiceIds);

        if (itemDeleteError) throw itemDeleteError;
      }

      const { error: invoiceDeleteError } = await supabase
        .from("invoices")
        .delete()
        .eq("vendor_id", buyer.buyer_id)
        .eq("user_id", userId);

      if (invoiceDeleteError) throw invoiceDeleteError;

      const { error: rateDeleteError } = await supabase
        .from("vendor_product_rates")
        .delete()
        .eq("vendor_id", buyer.buyer_id)
        .eq("user_id", userId);

      if (rateDeleteError) throw rateDeleteError;

      const { error: buyerDeleteError } = await supabase
        .from("vendors")
        .delete()
        .eq("id", buyer.buyer_id)
        .eq("user_id", userId);

      if (buyerDeleteError) throw buyerDeleteError;

      setMessage(`${buyer.buyer_name} was deleted.`);

      await loadDashboard(userId);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to delete buyer.");
    } finally {
      setDeletingBuyerId(null);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (authChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="font-semibold text-slate-600">
          Checking account...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-7 sm:px-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-400">
              Vendor Invoice
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Buyers Dashboard
            </h1>

            {userEmail && (
              <p className="mt-2 text-sm text-slate-400">
                Signed in as {userEmail}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/account-settings"
              className="rounded-xl border border-blue-500 bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Account Settings
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-6">
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Buyers"
            value={String(totals.buyers)}
          />

          <SummaryCard
            title="Total Invoiced"
            value={money(totals.invoiced)}
          />

          <SummaryCard
            title="Total Paid"
            value={money(totals.paid)}
            valueClassName="text-green-600"
          />

          <SummaryCard
            title="Total Balance"
            value={money(totals.balance)}
            valueClassName={
              totals.balance > 0
                ? "text-red-600"
                : "text-green-600"
            }
          />
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">
            Add Buyer
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add the person or business you provide credits to.
          </p>

          <form
            onSubmit={addBuyer}
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Buyer name"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3"
            />

            <button
              type="submit"
              disabled={addingBuyer}
              className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white disabled:opacity-50"
            >
              {addingBuyer ? "Adding..." : "+ Add Buyer"}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="text-2xl font-black">
              Your Buyers
            </h2>

            <p className="text-sm font-semibold text-slate-500">
              {buyerSummaries.length} buyers
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center">
              Loading buyers...
            </div>
          ) : buyerSummaries.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center">
              No buyers yet.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {buyerSummaries.map((buyer) => (
                <article
                  key={buyer.buyer_id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm"
                >
                  <div className="p-6">
                    {editingBuyerId === buyer.buyer_id ? (
                      <>
                        <input
                          value={editingBuyerName}
                          onChange={(e) =>
                            setEditingBuyerName(e.target.value)
                          }
                          className="w-full rounded-xl border px-4 py-3 font-bold"
                        />

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={saveBuyerName}
                            disabled={savingBuyer}
                            className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white"
                          >
                            Save
                          </button>

                          <button
                            onClick={cancelEditingBuyer}
                            className="rounded-lg bg-slate-100 px-4 py-2 font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-black">
                            {buyer.buyer_name}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {buyer.product_count} products
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            startEditingBuyer(buyer)
                          }
                          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold"
                        >
                          Edit Name
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 border-t">
                    <BuyerAmount
                      title="Invoiced"
                      value={money(buyer.total_invoiced)}
                    />

                    <BuyerAmount
                      title="Paid"
                      value={money(buyer.total_paid)}
                    />

                    <BuyerAmount
                      title="Balance"
                      value={money(buyer.balance)}
                    />
                  </div>

                  <div className="border-t border-slate-100 p-5">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Link
                        href={`/buyers/${buyer.buyer_id}#invoice`}
                        className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-700"
                      >
                        + Create Invoice
                      </Link>

                      <Link
                        href={`/buyers/${buyer.buyer_id}#payment`}
                        className="rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-green-700"
                      >
                        $ Record Payment
                      </Link>

                      <Link
                        href={`/buyers/${buyer.buyer_id}`}
                        className="rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        Manage Buyer
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteBuyer(buyer)}
                      disabled={deletingBuyerId === buyer.buyer_id}
                      className="mt-3 w-full rounded-xl bg-red-50 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingBuyerId === buyer.buyer_id
                        ? "Deleting..."
                        : "Delete Buyer"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  valueClassName = "text-slate-950",
}: {
  title: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">
        {title}
      </p>

      <p className={`mt-2 text-3xl font-black ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

function BuyerAmount({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="p-4 text-center">
      <p className="text-xs font-bold uppercase text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-lg font-black">
        {value}
      </p>
    </div>
  );
}