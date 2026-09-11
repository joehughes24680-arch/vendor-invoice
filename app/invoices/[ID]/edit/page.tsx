"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import SubscriptionGuard from "@/components/SubscriptionGuard";

type Invoice = {
  id: string;
  invoice_number: string;
  vendor_id: string;
  invoice_date: string;
  subtotal: number;
  amount_paid: number;
  status: string;
  balance_brought_forward: number;
};

type Buyer = {
  id: string;
  name: string;
};

type ProductRate = {
  product_id: string;
  product_name: string;
  percentage: number;
};

type InvoiceItem = {
  id: string;
  game_id: string | null;
  game_name: string;
  item_date: string;
  credits: number;
  percentage: number;
  amount: number;
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function EditInvoicePage() {
  const pathname = usePathname();

  const parts = pathname.split("/").filter(Boolean);

  const invoiceId =
    parts.length >= 3 ? parts[parts.length - 2] : "";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [products, setProducts] = useState<ProductRate[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [invoiceDate, setInvoiceDate] = useState("");

  const [itemDate, setItemDate] = useState(today());
  const [selectedProductId, setSelectedProductId] = useState("");
  const [credits, setCredits] = useState("");
  const [percentage, setPercentage] = useState("");

  const [editingItemId, setEditingItemId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadInvoice() {
    if (!invoiceId) {
      setError("No invoice ID found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const {
        data: invoiceData,
        error: invoiceError,
      } = await supabase
        .from("invoices")
        .select(
          `
          id,
          invoice_number,
          vendor_id,
          invoice_date,
          subtotal,
          amount_paid,
          status,
          balance_brought_forward
          `
        )
        .eq("id", invoiceId)
        .maybeSingle();

      if (invoiceError) {
        throw invoiceError;
      }

      if (!invoiceData) {
        throw new Error("Invoice not found.");
      }

      const loadedInvoice: Invoice = {
        id: invoiceData.id,
        invoice_number: invoiceData.invoice_number,
        vendor_id: invoiceData.vendor_id,
        invoice_date: invoiceData.invoice_date,
        subtotal: Number(invoiceData.subtotal || 0),
        amount_paid: Number(invoiceData.amount_paid || 0),
        status: invoiceData.status,
        balance_brought_forward: Number(
          invoiceData.balance_brought_forward || 0
        ),
      };

      setInvoice(loadedInvoice);
      setInvoiceDate(invoiceData.invoice_date);

      const {
        data: buyerData,
        error: buyerError,
      } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("id", invoiceData.vendor_id)
        .maybeSingle();

      if (buyerError) {
        throw buyerError;
      }

      if (buyerData) {
        setBuyer({
          id: buyerData.id,
          name: buyerData.name,
        });
      }

      const {
        data: productData,
        error: productError,
      } = await supabase
        .from("buyer_products")
        .select("*")
        .eq("buyer_id", invoiceData.vendor_id)
        .order("product_name", {
          ascending: true,
        });

      if (productError) {
        throw productError;
      }

      setProducts(
        (productData ?? []).map((row: any) => ({
          product_id: row.product_id,
          product_name: row.product_name,
          percentage: Number(row.percentage || 0),
        }))
      );

      const {
        data: itemData,
        error: itemError,
      } = await supabase
        .from("invoice_items")
        .select(
          `
          id,
          game_id,
          game_name,
          item_date,
          credits,
          percentage,
          amount,
          created_at
          `
        )
        .eq("invoice_id", invoiceId)
        .order("created_at", {
          ascending: true,
        });

      if (itemError) {
        throw itemError;
      }

      setItems(
        (itemData ?? []).map((row: any) => ({
          id: row.id,
          game_id: row.game_id,
          game_name: row.game_name,
          item_date:
            row.item_date || invoiceData.invoice_date,
          credits: Number(row.credits || 0),
          percentage: Number(row.percentage || 0),
          amount: Number(row.amount || 0),
        }))
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message || "Unable to load invoice."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const selectedProduct = products.find(
    (product) =>
      product.product_id === selectedProductId
  );

  function chooseProduct(productId: string) {
    setSelectedProductId(productId);

    const product = products.find(
      (item) => item.product_id === productId
    );

    if (product && !editingItemId) {
      setPercentage(String(product.percentage));
    }

    if (!product) {
      setPercentage("");
    }
  }

  const previewAmount = useMemo(() => {
    const creditAmount = Number(credits);
    const rate = Number(percentage);

    if (
      !Number.isFinite(creditAmount) ||
      !Number.isFinite(rate) ||
      creditAmount <= 0 ||
      rate < 0
    ) {
      return 0;
    }

    return (creditAmount * rate) / 100;
  }, [credits, percentage]);

  const currentCharges = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );
  }, [items]);

  const carriedBalance =
    invoice?.balance_brought_forward || 0;

  const invoiceTotal =
    currentCharges + carriedBalance;

  const balance =
    invoiceTotal - (invoice?.amount_paid || 0);

  const hasPreviousDue =
    carriedBalance > 0.005;

  const hasPreviousCredit =
    carriedBalance < -0.005;

  const hasRemainingCredit =
    balance < -0.005;

  function resetItemForm() {
    setItemDate(today());
    setSelectedProductId("");
    setCredits("");
    setPercentage("");
    setEditingItemId(null);
  }

  function editItem(item: InvoiceItem) {
    setEditingItemId(item.id);
    setItemDate(item.item_date || today());
    setSelectedProductId(item.game_id || "");
    setCredits(String(item.credits));
    setPercentage(String(item.percentage));
  }

  function addOrUpdateItem() {
    setError("");
    setMessage("");

    if (!itemDate) {
      setError("Select a date.");
      return;
    }

    if (!selectedProduct) {
      setError("Select a product.");
      return;
    }

    const creditAmount = Number(credits);
    const rate = Number(percentage);

    if (
      !Number.isFinite(creditAmount) ||
      creditAmount <= 0
    ) {
      setError("Enter a valid credit amount.");
      return;
    }

    if (
      !Number.isFinite(rate) ||
      rate < 0
    ) {
      setError("Enter a valid percentage.");
      return;
    }

    const amount =
      (creditAmount * rate) / 100;

    if (editingItemId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingItemId
            ? {
                ...item,
                game_id:
                  selectedProduct.product_id,
                game_name:
                  selectedProduct.product_name,
                item_date: itemDate,
                credits: creditAmount,
                percentage: rate,
                amount,
              }
            : item
        )
      );
    } else {
      setItems((current) => [
        ...current,
        {
          id: `new-${crypto.randomUUID()}`,
          game_id:
            selectedProduct.product_id,
          game_name:
            selectedProduct.product_name,
          item_date: itemDate,
          credits: creditAmount,
          percentage: rate,
          amount,
        },
      ]);
    }

    resetItemForm();
  }

  function deleteItem(itemId: string) {
    const item = items.find(
      (row) => row.id === itemId
    );

    if (!item) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${item.game_name} from this invoice?`
    );

    if (!confirmed) {
      return;
    }

    setItems((current) =>
      current.filter(
        (row) => row.id !== itemId
      )
    );

    if (editingItemId === itemId) {
      resetItemForm();
    }
  }

  async function saveInvoiceChanges() {
    if (!invoice) {
      return;
    }

    setError("");
    setMessage("");

    if (!invoiceDate) {
      setError("Select an invoice date.");
      return;
    }

    if (items.length === 0) {
      setError(
        "The invoice must have at least one product."
      );
      return;
    }

    const newCurrentCharges = items.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );

    const newInvoiceTotal =
      newCurrentCharges +
      invoice.balance_brought_forward;

    if (
      invoice.amount_paid > 0 &&
      newInvoiceTotal < invoice.amount_paid
    ) {
      setError(
        `This invoice already has ${money(
          invoice.amount_paid
        )} paid. The new invoice total cannot be less than that amount.`
      );

      return;
    }

    const confirmed = window.confirm(
      `Save changes to ${invoice.invoice_number}?`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const {
        error: invoiceError,
      } = await supabase
        .from("invoices")
        .update({
          invoice_date: invoiceDate,
        })
        .eq("id", invoice.id);

      if (invoiceError) {
        throw invoiceError;
      }

      const {
        error: deleteError,
      } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoice.id);

      if (deleteError) {
        throw deleteError;
      }

      const rows = items.map((item) => ({
        invoice_id: invoice.id,
        game_id: item.game_id,
        game_name: item.game_name,
        item_date: item.item_date,
        credits: item.credits,
        percentage: item.percentage,
      }));

      const {
        error: insertError,
      } = await supabase
        .from("invoice_items")
        .insert(rows);

      if (insertError) {
        throw insertError;
      }

      setMessage(
        "Invoice updated successfully."
      );

      resetItemForm();

      await loadInvoice();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to update invoice."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SubscriptionGuard>
        <main className="min-h-screen bg-gray-100 p-8">
          <div className="mx-auto max-w-6xl rounded-2xl bg-white p-10 text-center shadow-sm">
            Loading invoice...
          </div>
        </main>
      </SubscriptionGuard>
    );
  }

  if (!invoice) {
    return (
      <SubscriptionGuard>
        <main className="min-h-screen bg-gray-100 p-8">
          <div className="mx-auto max-w-6xl rounded-2xl bg-white p-10 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-950">
              Invoice Not Found
            </h1>

            {error && (
              <p className="mt-3 text-red-600">
                {error}
              </p>
            )}

            <Link
              href="/dashboard"
              className="mt-6 inline-block font-semibold text-blue-600 hover:underline"
            >
              ← Back to Buyers
            </Link>
          </div>
        </main>
      </SubscriptionGuard>
    );
  }

  return (
    <SubscriptionGuard>
      <main className="min-h-screen bg-gray-100 text-slate-900">
        <header className="bg-slate-900 text-white">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <Link
              href={`/buyers/${invoice.vendor_id}`}
              className="text-sm font-semibold text-slate-300 hover:text-white"
            >
              ← Back to {buyer?.name || "Buyer"}
            </Link>

            <p className="mt-6 text-sm font-bold uppercase tracking-wide text-blue-300">
              Edit Saved Invoice
            </p>

            <h1 className="mt-1 text-3xl font-bold text-white">
              {invoice.invoice_number}
            </h1>

            <p className="mt-2 text-slate-300">
              {buyer?.name}
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
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

          <section className="grid gap-4 md:grid-cols-4">
            <Summary
              title="Current Charges"
              value={money(currentCharges)}
            />

            <Summary
              title={
                hasPreviousCredit
                  ? "Previous Credit"
                  : "Previous Balance"
              }
              value={
                hasPreviousCredit
                  ? `-${money(
                      Math.abs(carriedBalance)
                    )}`
                  : money(carriedBalance)
              }
              className={
                hasPreviousCredit
                  ? "text-green-600"
                  : hasPreviousDue
                  ? "text-red-600"
                  : "text-gray-900"
              }
            />

            <Summary
              title="Paid"
              value={money(invoice.amount_paid)}
              className="text-green-600"
            />

            <Summary
              title={
                hasRemainingCredit
                  ? "Credit Remaining"
                  : "Balance"
              }
              value={money(Math.abs(balance))}
              className={
                hasRemainingCredit
                  ? "text-green-600"
                  : balance > 0
                  ? "text-red-600"
                  : "text-green-600"
              }
            />
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Invoice Date
            </h2>

            <input
              type="date"
              value={invoiceDate}
              onChange={(e) =>
                setInvoiceDate(e.target.value)
              }
              className="mt-4 max-w-sm rounded-xl border border-gray-300 px-4 py-3 text-slate-950"
            />
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  {editingItemId
                    ? "Edit Product"
                    : "Add Product"}
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Add or update products on this invoice.
                </p>
              </div>

              {editingItemId && (
                <button
                  type="button"
                  onClick={resetItemForm}
                  className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-slate-700 hover:bg-gray-200"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <div>
                <label className="mb-2 block font-semibold text-slate-800">
                  Date
                </label>

                <input
                  type="date"
                  value={itemDate}
                  onChange={(e) =>
                    setItemDate(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-slate-950"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold text-slate-800">
                  Product
                </label>

                <select
                  value={selectedProductId}
                  onChange={(e) =>
                    chooseProduct(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-slate-950"
                >
                  <option value="">
                    Select product
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.product_id}
                      value={product.product_id}
                    >
                      {product.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block font-semibold text-slate-800">
                  Credits
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={credits}
                  onChange={(e) =>
                    setCredits(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-slate-950"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold text-slate-800">
                  Percentage
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={percentage}
                  onChange={(e) =>
                    setPercentage(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-slate-950"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold text-slate-800">
                  Amount
                </label>

                <div className="rounded-xl bg-gray-100 px-4 py-3 font-bold text-slate-950">
                  {money(previewAmount)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={addOrUpdateItem}
              className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
            >
              {editingItemId
                ? "Save Product Changes"
                : "+ Add Product"}
            </button>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Invoice Products
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Current products and charges for this invoice.
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Invoice Total
                </p>

                <p className="mt-1 text-2xl font-black text-blue-600">
                  {money(invoiceTotal)}
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-3">
                      Date
                    </th>

                    <th className="pb-3">
                      Product
                    </th>

                    <th className="pb-3 text-right">
                      Credits
                    </th>

                    <th className="pb-3 text-right">
                      Rate
                    </th>

                    <th className="pb-3 text-right">
                      Amount
                    </th>

                    <th className="pb-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100"
                    >
                      <td className="py-4 font-medium text-slate-700">
                        {formatDate(
                          item.item_date
                        )}
                      </td>

                      <td className="py-4 font-semibold text-slate-950">
                        {item.game_name}
                      </td>

                      <td className="py-4 text-right font-medium text-slate-700">
                        {formatNumber(
                          item.credits
                        )}
                      </td>

                      <td className="py-4 text-right font-medium text-slate-700">
                        {item.percentage}%
                      </td>

                      <td className="py-4 text-right font-bold text-slate-950">
                        {money(item.amount)}
                      </td>

                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              editItem(item)
                            }
                            className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteItem(item.id)
                            }
                            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {hasPreviousDue && (
                    <tr className="border-b border-amber-200 bg-amber-50">
                      <td className="py-4 text-slate-500">
                        —
                      </td>

                      <td
                        colSpan={3}
                        className="py-4 font-bold text-slate-950"
                      >
                        Previous Balance Due
                      </td>

                      <td className="py-4 text-right font-bold text-red-600">
                        {money(
                          carriedBalance
                        )}
                      </td>

                      <td />
                    </tr>
                  )}

                  {hasPreviousCredit && (
                    <tr className="border-b border-green-200 bg-green-50">
                      <td className="py-4 text-slate-500">
                        —
                      </td>

                      <td
                        colSpan={3}
                        className="py-4 font-bold text-slate-950"
                      >
                        Previous Credit
                      </td>

                      <td className="py-4 text-right font-bold text-green-600">
                        -
                        {money(
                          Math.abs(
                            carriedBalance
                          )
                        )}
                      </td>

                      <td />
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td
                      colSpan={4}
                      className="pt-6 text-right font-semibold text-slate-600"
                    >
                      Current Charges
                    </td>

                    <td className="pt-6 text-right text-lg font-bold text-slate-950">
                      {money(currentCharges)}
                    </td>

                    <td />
                  </tr>

                  {Math.abs(carriedBalance) >=
                    0.005 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="pt-3 text-right font-semibold text-slate-600"
                      >
                        {hasPreviousCredit
                          ? "Previous Credit"
                          : "Previous Balance Due"}
                      </td>

                      <td
                        className={`pt-3 text-right text-lg font-bold ${
                          hasPreviousCredit
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {hasPreviousCredit
                          ? "-"
                          : "+"}
                        {money(
                          Math.abs(
                            carriedBalance
                          )
                        )}
                      </td>

                      <td />
                    </tr>
                  )}

                  <tr>
                    <td
                      colSpan={4}
                      className="border-t border-gray-200 pt-4 text-right text-xl font-bold text-slate-950"
                    >
                      Invoice Total
                    </td>

                    <td className="border-t border-gray-200 pt-4 text-right text-2xl font-bold text-blue-600">
                      {money(invoiceTotal)}
                    </td>

                    <td className="border-t border-gray-200" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Save Invoice Changes
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  Update the saved invoice after finishing your changes.
                </p>
              </div>

              <button
                type="button"
                onClick={saveInvoiceChanges}
                disabled={saving}
                className="rounded-xl bg-green-600 px-8 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </SubscriptionGuard>
  );
}

function Summary({
  title,
  value,
  className = "text-gray-900",
}: {
  title: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${className}`}
      >
        {value}
      </p>
    </div>
  );
}