"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type BuyerSummary = {
  buyer_id: string;
  buyer_name: string;
  product_count: number;
  total_invoiced: number;
  total_paid: number;
  balance: number;
};

export default function HomePage() {
  const [buyers, setBuyers] = useState<BuyerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [newBuyerName, setNewBuyerName] = useState("");
  const [addingBuyer, setAddingBuyer] = useState(false);

  const [editingBuyerId, setEditingBuyerId] = useState<string | null>(null);
  const [editingBuyerName, setEditingBuyerName] = useState("");
  const [savingBuyer, setSavingBuyer] = useState(false);

  const [deletingBuyerId, setDeletingBuyerId] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function money(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value || 0));
  }

  async function loadBuyers() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("buyer_account_summary")
        .select("*")
        .order("buyer_name", { ascending: true });

      if (error) throw error;

      setBuyers(
        (data ?? []).map((row: any) => ({
          buyer_id: row.buyer_id,
          buyer_name: row.buyer_name,
          product_count: Number(row.product_count || 0),
          total_invoiced: Number(row.total_invoiced || 0),
          total_paid: Number(row.total_paid || 0),
          balance: Number(row.balance || 0),
        }))
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to load buyers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBuyers();
  }, []);

  async function addBuyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const name = newBuyerName.trim();

    if (!name) {
      setError("Enter a buyer name.");
      return;
    }

    setAddingBuyer(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.from("vendors").insert({
        name,
        active: true,
      });

      if (error) throw error;

      setNewBuyerName("");
      setMessage(`${name} added successfully.`);

      await loadBuyers();
    } catch (err: any) {
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
    if (!editingBuyerId) return;

    const name = editingBuyerName.trim();

    if (!name) {
      setError("Buyer name cannot be empty.");
      return;
    }

    setSavingBuyer(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase
        .from("vendors")
        .update({
          name,
        })
        .eq("id", editingBuyerId);

      if (error) throw error;

      setMessage("Buyer updated successfully.");

      setEditingBuyerId(null);
      setEditingBuyerName("");

      await loadBuyers();
    } catch (err: any) {
      setError(err?.message || "Unable to update buyer.");
    } finally {
      setSavingBuyer(false);
    }
  }

  async function deleteBuyer(buyer: BuyerSummary) {
    const confirmed = window.confirm(
      `Delete ${buyer.buyer_name}?\n\nThis will permanently delete this buyer, their invoices, payments, and product percentages.\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingBuyerId(buyer.buyer_id);
    setError("");
    setMessage("");

    try {
      /*
        STEP 1
        Get all invoice IDs belonging to this buyer.
      */
      const { data: invoiceRows, error: invoiceLoadError } =
        await supabase
          .from("invoices")
          .select("id")
          .eq("vendor_id", buyer.buyer_id);

      if (invoiceLoadError) throw invoiceLoadError;

      const invoiceIds = (invoiceRows ?? []).map(
        (invoice: any) => invoice.id
      );

      /*
        STEP 2
        Delete payments belonging to buyer.

        We do this before deleting invoices because payments
        can reference invoice IDs.
      */
      const { error: paymentDeleteError } = await supabase
        .from("payments")
        .delete()
        .eq("vendor_id", buyer.buyer_id);

      if (paymentDeleteError) throw paymentDeleteError;

      /*
        STEP 3
        Delete invoice items.

        Even if your database already has ON DELETE CASCADE,
        deleting them here makes buyer deletion explicit.
      */
      if (invoiceIds.length > 0) {
        const { error: itemDeleteError } = await supabase
          .from("invoice_items")
          .delete()
          .in("invoice_id", invoiceIds);

        if (itemDeleteError) throw itemDeleteError;
      }

      /*
        STEP 4
        Delete invoices.
      */
      const { error: invoiceDeleteError } = await supabase
        .from("invoices")
        .delete()
        .eq("vendor_id", buyer.buyer_id);

      if (invoiceDeleteError) throw invoiceDeleteError;

      /*
        STEP 5
        Delete buyer/product percentages.
      */
      const { error: rateDeleteError } = await supabase
        .from("vendor_product_rates")
        .delete()
        .eq("vendor_id", buyer.buyer_id);

      if (rateDeleteError) throw rateDeleteError;

      /*
        STEP 6
        Finally delete the buyer.
      */
      const { error: buyerDeleteError } = await supabase
        .from("vendors")
        .delete()
        .eq("id", buyer.buyer_id);

      if (buyerDeleteError) throw buyerDeleteError;

      if (editingBuyerId === buyer.buyer_id) {
        cancelEditingBuyer();
      }

      setMessage(`${buyer.buyer_name} deleted successfully.`);

      await loadBuyers();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to delete buyer. No further changes were made."
      );
    } finally {
      setDeletingBuyerId(null);
    }
  }

  const totalInvoiced = buyers.reduce(
    (sum, buyer) => sum + buyer.total_invoiced,
    0
  );

  const totalPaid = buyers.reduce(
    (sum, buyer) => sum + buyer.total_paid,
    0
  );

  const totalBalance = buyers.reduce(
    (sum, buyer) => sum + buyer.balance,
    0
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      {/* HEADER */}
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-[1500px] px-6 py-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
            Buyer Management
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Buyers
          </h1>

          <p className="mt-2 text-slate-300">
            Manage buyers, invoices, payments and balances.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 px-6 py-6">
        {/* MESSAGES */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-800">
            {message}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Buyers"
            value={String(buyers.length)}
          />

          <SummaryCard
            title="Total Invoiced"
            value={money(totalInvoiced)}
          />

          <SummaryCard
            title="Total Paid"
            value={money(totalPaid)}
          />

          <SummaryCard
            title="Total Balance"
            value={money(totalBalance)}
          />
        </section>

        {/* ADD BUYER */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black">
                Add Buyer
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-600">
                Create a new buyer account.
              </p>
            </div>

            <form
              onSubmit={addBuyer}
              className="flex w-full max-w-xl gap-3"
            >
              <input
                value={newBuyerName}
                onChange={(e) =>
                  setNewBuyerName(e.target.value)
                }
                placeholder="Buyer name"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-950 placeholder:text-slate-400"
              />

              <button
                type="submit"
                disabled={addingBuyer}
                className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingBuyer ? "Adding..." : "+ Add Buyer"}
              </button>
            </form>
          </div>
        </section>

        {/* BUYERS */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black">
                Buyer List
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-600">
                Click a buyer to manage their account.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center font-semibold text-slate-700 shadow-sm">
              Loading buyers...
            </div>
          ) : buyers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <h3 className="text-xl font-bold">
                No buyers yet
              </h3>

              <p className="mt-2 text-slate-600">
                Add your first buyer above.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {buyers.map((buyer) => {
                const isEditing =
                  editingBuyerId === buyer.buyer_id;

                const isDeleting =
                  deletingBuyerId === buyer.buyer_id;

                return (
                  <div
                    key={buyer.buyer_id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    {/* BUYER CARD HEADER */}
                    <div className="border-b border-slate-200 px-5 py-5">
                      {isEditing ? (
                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Buyer Name
                          </label>

                          <input
                            autoFocus
                            value={editingBuyerName}
                            onChange={(e) =>
                              setEditingBuyerName(
                                e.target.value
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveBuyerName();
                              }

                              if (e.key === "Escape") {
                                cancelEditingBuyer();
                              }
                            }}
                            className="w-full rounded-xl border border-blue-400 px-4 py-3 text-lg font-bold text-slate-950 outline-none ring-blue-100 focus:ring-4"
                          />

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={saveBuyerName}
                              disabled={savingBuyer}
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {savingBuyer
                                ? "Saving..."
                                : "Save"}
                            </button>

                            <button
                              type="button"
                              onClick={cancelEditingBuyer}
                              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-black text-slate-950">
                              {buyer.buyer_name}
                            </h3>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {buyer.product_count}{" "}
                              {buyer.product_count === 1
                                ? "product"
                                : "products"}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                startEditingBuyer(buyer)
                              }
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteBuyer(buyer)
                              }
                              disabled={isDeleting}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* BUYER NUMBERS */}
                    <div className="grid grid-cols-3 divide-x divide-slate-200">
                      <div className="px-4 py-4">
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Invoiced
                        </p>

                        <p className="mt-1 font-black text-slate-950">
                          {money(buyer.total_invoiced)}
                        </p>
                      </div>

                      <div className="px-4 py-4">
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Paid
                        </p>

                        <p className="mt-1 font-black text-green-700">
                          {money(buyer.total_paid)}
                        </p>
                      </div>

                      <div className="px-4 py-4">
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Balance
                        </p>

                        <p
                          className={`mt-1 font-black ${
                            buyer.balance > 0
                              ? "text-red-700"
                              : "text-slate-950"
                          }`}
                        >
                          {money(buyer.balance)}
                        </p>
                      </div>
                    </div>

                    {/* OPEN BUYER */}
                    <div className="border-t border-slate-200 p-4">
                      <Link
                        href={`/buyers/${buyer.buyer_id}`}
                        className="block w-full rounded-xl bg-slate-950 px-5 py-3 text-center font-bold text-white hover:bg-slate-800"
                      >
                        Manage Buyer →
                      </Link>
                    </div>
                  </div>
                );
              })}
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
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <p className="text-sm font-bold text-slate-600">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}