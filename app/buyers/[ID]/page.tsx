"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Buyer = {
  id: string;
  name: string;
};

type ProductRate = {
  rate_id: string;
  product_id: string;
  product_name: string;
  percentage: number;
};

type InvoiceItemDraft = {
  temp_id: string;
  product_id: string;
  product_name: string;
  item_date: string;
  credits: number;
  percentage: number;
  amount: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  subtotal: number;
  amount_paid: number;
  status: string;
};

type Payment = {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(value: string) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export default function BuyerPage() {
  const pathname = usePathname();

  const buyerId = pathname
    ? pathname.split("/").filter(Boolean).pop() || ""
    : "";

  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [products, setProducts] = useState<ProductRate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newProductName, setNewProductName] = useState("");
  const [newPercentage, setNewPercentage] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);

  const [invoiceDate, setInvoiceDate] = useState(today());

  const [itemDate, setItemDate] = useState(today());
  const [selectedProductId, setSelectedProductId] = useState("");
  const [credits, setCredits] = useState("");
  const [itemPercentage, setItemPercentage] = useState("");
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemDraft[]>(
    []
  );
  const [editingDraftId, setEditingDraftId] = useState<string | null>(
    null
  );
  const [savingInvoice, setSavingInvoice] = useState(false);

  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

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

  async function loadBuyer() {
    if (!buyerId) {
      setError("No buyer ID found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data: buyerData, error: buyerError } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("id", buyerId)
        .maybeSingle();

      if (buyerError) throw buyerError;
      if (!buyerData) throw new Error("Buyer not found.");

      setBuyer({
        id: buyerData.id,
        name: buyerData.name,
      });

      const { data: productData, error: productError } = await supabase
        .from("buyer_products")
        .select("*")
        .eq("buyer_id", buyerId)
        .order("product_name", { ascending: true });

      if (productError) throw productError;

      setProducts(
        (productData ?? []).map((row: any) => ({
          rate_id: row.rate_id,
          product_id: row.product_id,
          product_name: row.product_name,
          percentage: Number(row.percentage || 0),
        }))
      );

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, invoice_date, subtotal, amount_paid, status, created_at"
        )
        .eq("vendor_id", buyerId)
        .order("invoice_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (invoiceError) throw invoiceError;

      setInvoices(
        (invoiceData ?? []).map((row: any) => ({
          id: row.id,
          invoice_number: row.invoice_number,
          invoice_date: row.invoice_date,
          subtotal: Number(row.subtotal || 0),
          amount_paid: Number(row.amount_paid || 0),
          status: row.status,
        }))
      );

      const { data: paymentData, error: paymentError } = await supabase
        .from("buyer_payment_history")
        .select("*")
        .eq("buyer_id", buyerId)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (paymentError) throw paymentError;

      setPayments(
        (paymentData ?? []).map((row: any) => ({
          id: row.id,
          payment_date: row.payment_date,
          amount: Number(row.amount || 0),
          payment_method: row.payment_method || "Cash",
          notes: row.notes,
          invoice_id: row.invoice_id,
          invoice_number: row.invoice_number,
        }))
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to load buyer.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBuyer();
  }, [buyerId]);

  useEffect(() => {
    if (loading || !buyer) return;

    const hash = window.location.hash.replace("#", "");

    if (!hash) return;

    const timer = window.setTimeout(() => {
      const element = document.getElementById(hash);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);

    return () => window.clearTimeout(timer);
  }, [loading, buyer]);

  async function addProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const productName = newProductName.trim();
    const percentage = Number(newPercentage);

    if (!productName) {
      setError("Enter a product name.");
      return;
    }

    if (!Number.isFinite(percentage) || percentage < 0) {
      setError("Enter a valid percentage.");
      return;
    }

    setAddingProduct(true);
    setError("");
    setMessage("");

    try {
      let productId = "";

      const { data: existing, error: existingError } = await supabase
        .from("games")
        .select("id, name")
        .ilike("name", productName)
        .limit(1);

      if (existingError) throw existingError;

      if (existing && existing.length > 0) {
        productId = existing[0].id;
      } else {
        const { data: created, error: createError } = await supabase
          .from("games")
          .insert({
            name: productName,
            active: true,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        productId = created.id;
      }

      const alreadyExists = products.some(
        (product) => product.product_id === productId
      );

      if (alreadyExists) {
        throw new Error("This product is already added to this buyer.");
      }

      const { error: rateError } = await supabase
        .from("vendor_product_rates")
        .insert({
          vendor_id: buyerId,
          game_id: productId,
          percentage,
        });

      if (rateError) throw rateError;

      setNewProductName("");
      setNewPercentage("");
      setMessage("Product added successfully.");

      await loadBuyer();
    } catch (err: any) {
      setError(err?.message || "Unable to add product.");
    } finally {
      setAddingProduct(false);
    }
  }

  async function updatePercentage(rateId: string, percentage: number) {
    setError("");
    setMessage("");

    if (!Number.isFinite(percentage) || percentage < 0) {
      setError("Enter a valid percentage.");
      return;
    }

    const { error } = await supabase
      .from("vendor_product_rates")
      .update({
        percentage,
      })
      .eq("id", rateId);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Percentage updated.");
    await loadBuyer();
  }

  async function deleteProduct(product: ProductRate) {
    const confirmed = window.confirm(
      `Delete ${product.product_name} from this buyer?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("vendor_product_rates")
      .delete()
      .eq("id", product.rate_id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Product deleted.");
    await loadBuyer();
  }

  function chooseProduct(productId: string) {
    setSelectedProductId(productId);

    const product = products.find(
      (item) => item.product_id === productId
    );

    if (product) {
      setItemPercentage(String(product.percentage));
    } else {
      setItemPercentage("");
    }
  }

  const selectedProduct = products.find(
    (product) => product.product_id === selectedProductId
  );

  const calculatedAmount = useMemo(() => {
    const creditAmount = Number(credits);
    const percentage = Number(itemPercentage);

    if (
      !selectedProduct ||
      !Number.isFinite(creditAmount) ||
      !Number.isFinite(percentage) ||
      creditAmount <= 0 ||
      percentage < 0
    ) {
      return 0;
    }

    return (creditAmount * percentage) / 100;
  }, [selectedProduct, credits, itemPercentage]);

  function resetInvoiceItemForm() {
    setSelectedProductId("");
    setCredits("");
    setItemPercentage("");
    setItemDate(today());
    setEditingDraftId(null);
  }

  function addOrUpdateInvoiceItem() {
    setError("");
    setMessage("");

    if (!selectedProduct) {
      setError("Select a product.");
      return;
    }

    if (!itemDate) {
      setError("Select a date.");
      return;
    }

    const creditAmount = Number(credits);
    const percentage = Number(itemPercentage);

    if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
      setError("Enter valid credits.");
      return;
    }

    if (!Number.isFinite(percentage) || percentage < 0) {
      setError("Enter a valid percentage.");
      return;
    }

    const amount = (creditAmount * percentage) / 100;

    if (editingDraftId) {
      setInvoiceItems((current) =>
        current.map((item) =>
          item.temp_id === editingDraftId
            ? {
                ...item,
                product_id: selectedProduct.product_id,
                product_name: selectedProduct.product_name,
                item_date: itemDate,
                credits: creditAmount,
                percentage,
                amount,
              }
            : item
        )
      );
    } else {
      setInvoiceItems((current) => [
        ...current,
        {
          temp_id: crypto.randomUUID(),
          product_id: selectedProduct.product_id,
          product_name: selectedProduct.product_name,
          item_date: itemDate,
          credits: creditAmount,
          percentage,
          amount,
        },
      ]);
    }

    resetInvoiceItemForm();
  }

  function editInvoiceItem(item: InvoiceItemDraft) {
    setEditingDraftId(item.temp_id);
    setSelectedProductId(item.product_id);
    setItemDate(item.item_date);
    setCredits(String(item.credits));
    setItemPercentage(String(item.percentage));
  }

  function removeInvoiceItem(tempId: string) {
    setInvoiceItems((current) =>
      current.filter((item) => item.temp_id !== tempId)
    );

    if (editingDraftId === tempId) {
      resetInvoiceItemForm();
    }
  }

  const invoiceTotal = useMemo(() => {
    return invoiceItems.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
  }, [invoiceItems]);

  async function saveInvoice() {
    if (!invoiceDate) {
      setError("Select an invoice date.");
      return;
    }

    if (invoiceItems.length === 0) {
      setError("Add at least one product.");
      return;
    }

    setSavingInvoice(true);
    setError("");
    setMessage("");

    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          vendor_id: buyerId,
          invoice_date: invoiceDate,
          subtotal: 0,
          amount_paid: 0,
          status: "unpaid",
        })
        .select("id, invoice_number")
        .single();

      if (invoiceError) throw invoiceError;

      const rows = invoiceItems.map((item) => ({
        invoice_id: invoiceData.id,
        game_id: item.product_id,
        game_name: item.product_name,
        item_date: item.item_date,
        credits: item.credits,
        percentage: item.percentage,
      }));

      const { error: itemError } = await supabase
        .from("invoice_items")
        .insert(rows);

      if (itemError) {
        await supabase
          .from("invoices")
          .delete()
          .eq("id", invoiceData.id);

        throw itemError;
      }

      setInvoiceItems([]);
      resetInvoiceItemForm();

      setMessage(
        `Invoice ${invoiceData.invoice_number} saved successfully.`
      );

      await loadBuyer();
    } catch (err: any) {
      setError(err?.message || "Unable to save invoice.");
    } finally {
      setSavingInvoice(false);
    }
  }

  async function deleteSavedInvoice(invoice: Invoice) {
    const confirmed = window.confirm(
      `Delete ${invoice.invoice_number}? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const linkedPayments = payments.filter(
        (payment) => payment.invoice_id === invoice.id
      );

      if (linkedPayments.length > 0) {
        throw new Error(
          "This invoice has payment history. Delete or adjust those payments first."
        );
      }

      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoice.id);

      if (error) throw error;

      setMessage(`${invoice.invoice_number} deleted.`);
      await loadBuyer();
    } catch (err: any) {
      setError(err?.message || "Unable to delete invoice.");
    }
  }

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.subtotal - invoice.amount_paid > 0
  );

  async function recordPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const amount = Number(paymentAmount);

    if (!paymentInvoiceId) {
      setError("Select an invoice.");
      return;
    }

    if (!paymentDate) {
      setError("Select a payment date.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    const invoice = invoices.find(
      (item) => item.id === paymentInvoiceId
    );

    if (!invoice) {
      setError("Invoice not found.");
      return;
    }

    const remaining = invoice.subtotal - invoice.amount_paid;

    if (amount > remaining) {
      setError(`Payment cannot exceed ${money(remaining)}.`);
      return;
    }

    setSavingPayment(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.from("payments").insert({
        vendor_id: buyerId,
        invoice_id: paymentInvoiceId,
        payment_date: paymentDate,
        amount,
        payment_method: "Cash",
        payment_type: "cash",
        notes: paymentNotes.trim() || null,
      });

      if (error) throw error;

      setPaymentInvoiceId("");
      setPaymentAmount("");
      setPaymentNotes("");

      setMessage("Payment recorded.");
      await loadBuyer();
    } catch (err: any) {
      setError(err?.message || "Unable to record payment.");
    } finally {
      setSavingPayment(false);
    }
  }

  const totalInvoiced = invoices.reduce(
    (sum, invoice) => sum + invoice.subtotal,
    0
  );

  const totalPaid = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  const balanceDue = totalInvoiced - totalPaid;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            Loading buyer...
          </div>
        </div>
      </main>
    );
  }

  if (!buyer) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold">Buyer not found</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-[1500px] px-6 py-7">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-blue-300 hover:text-blue-200"
          >
            ← Back to Buyers
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-white">
            {buyer.name}
          </h1>

          <p className="mt-1 text-sm text-slate-300">
            Products, invoices and payments
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-5 px-6 py-6">
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

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Total Invoiced"
            value={money(totalInvoiced)}
            tone="blue"
          />

          <MetricCard
            title="Total Paid"
            value={money(totalPaid)}
            tone="green"
          />

          <MetricCard
            title="Balance Due"
            value={money(balanceDue)}
            tone="red"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-5">
            <Panel title="Products & Percentages">
              <form
                onSubmit={addProduct}
                className="grid gap-3 md:grid-cols-[1fr_150px_auto]"
              >
                <input
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Product name"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400"
                />

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPercentage}
                  onChange={(e) => setNewPercentage(e.target.value)}
                  placeholder="Percentage"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400"
                />

                <button
                  type="submit"
                  disabled={addingProduct}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingProduct ? "Adding..." : "+ Add Product"}
                </button>
              </form>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-left text-sm font-bold text-slate-700">
                      <th className="pb-3">Product</th>
                      <th className="pb-3">Percentage</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map((product) => (
                      <ProductRow
                        key={product.rate_id}
                        product={product}
                        onSave={updatePercentage}
                        onDelete={deleteProduct}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Invoice History">
              {invoices.length === 0 ? (
                <p className="text-sm font-medium text-slate-600">
                  No invoices yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px]">
                    <thead>
                      <tr className="border-b border-slate-300 text-left text-sm font-bold text-slate-700">
                        <th className="pb-3">Invoice</th>
                        <th className="pb-3">Invoice Date</th>
                        <th className="pb-3 text-right">Total</th>
                        <th className="pb-3 text-right">Paid</th>
                        <th className="pb-3 text-right">Balance</th>
                        <th className="pb-3 text-right">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {invoices.map((invoice) => {
                        const balance =
                          invoice.subtotal - invoice.amount_paid;

                        return (
                          <tr
                            key={invoice.id}
                            className="border-b border-slate-200"
                          >
                            <td className="py-4 font-bold text-slate-950">
                              {invoice.invoice_number}
                            </td>

                            <td className="py-4 font-medium text-slate-700">
                              {formatDate(invoice.invoice_date)}
                            </td>

                            <td className="py-4 text-right font-semibold">
                              {money(invoice.subtotal)}
                            </td>

                            <td className="py-4 text-right font-semibold">
                              {money(invoice.amount_paid)}
                            </td>

                            <td className="py-4 text-right font-bold">
                              {money(balance)}
                            </td>

                            <td className="py-4 text-right">
                              <StatusBadge status={invoice.status} />
                            </td>

                            <td className="py-4">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/invoices/${invoice.id}`}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
                                >
                                  View
                                </Link>

                                <Link
                                  href={`/invoices/${invoice.id}/edit`}
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                                >
                                  Edit
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteSavedInvoice(invoice)
                                  }
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel id="payment" title="Record Cash Payment">
              <form
                onSubmit={recordPayment}
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
              >
                <Field label="Invoice">
                  <select
                    value={paymentInvoiceId}
                    onChange={(e) =>
                      setPaymentInvoiceId(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  >
                    <option value="">Select invoice</option>

                    {unpaidInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} —{" "}
                        {money(
                          invoice.subtotal - invoice.amount_paid
                        )}{" "}
                        due
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Payment Date">
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) =>
                      setPaymentDate(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                  />
                </Field>

                <Field label="Cash Amount">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) =>
                      setPaymentAmount(e.target.value)
                    }
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400"
                  />
                </Field>

                <Field label="Notes">
                  <input
                    value={paymentNotes}
                    onChange={(e) =>
                      setPaymentNotes(e.target.value)
                    }
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400"
                  />
                </Field>

                <div className="md:col-span-2 xl:col-span-4">
                  <button
                    type="submit"
                    disabled={savingPayment}
                    className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingPayment
                      ? "Recording..."
                      : "Record Payment"}
                  </button>
                </div>
              </form>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel id="invoice" title="Create Invoice">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4">
                  <Field label="Invoice Date">
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) =>
                        setInvoiceDate(e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    />
                  </Field>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-lg font-bold text-slate-950">
                      {editingDraftId
                        ? "Edit Product"
                        : "Add Product to Invoice"}
                    </h3>
                  </div>

                  <Field label="Date">
                    <input
                      type="date"
                      value={itemDate}
                      onChange={(e) =>
                        setItemDate(e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    />
                  </Field>

                  <Field label="Product">
                    <select
                      value={selectedProductId}
                      onChange={(e) =>
                        chooseProduct(e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                    >
                      <option value="">Select product</option>

                      {products.map((product) => (
                        <option
                          key={product.product_id}
                          value={product.product_id}
                        >
                          {product.product_name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Credits">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={credits}
                      onChange={(e) => setCredits(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400"
                    />
                  </Field>

                  <Field label="Percentage">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemPercentage}
                      onChange={(e) =>
                        setItemPercentage(e.target.value)
                      }
                      placeholder="e.g. 65"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400"
                    />
                  </Field>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <span className="font-bold text-slate-800">
                      Amount
                    </span>

                    <span className="text-2xl font-bold text-blue-700">
                      {money(calculatedAmount)}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={addOrUpdateInvoiceItem}
                      className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                    >
                      {editingDraftId
                        ? "Save Product Changes"
                        : "Add to Invoice"}
                    </button>

                    {editingDraftId && (
                      <button
                        type="button"
                        onClick={resetInvoiceItemForm}
                        className="rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-800"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-l-0 border-slate-200 lg:border-l lg:pl-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-950">
                        Current Invoice
                      </h3>

                      <p className="text-sm font-medium text-slate-600">
                        Review before saving
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 px-4 py-3 text-right">
                      <p className="text-xs font-bold uppercase text-blue-700">
                        Invoice Date
                      </p>

                      <p className="mt-1 font-bold text-slate-950">
                        {formatDate(invoiceDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {invoiceItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-600">
                        Add products to the invoice.
                      </div>
                    ) : (
                      invoiceItems.map((item) => (
                        <div
                          key={item.temp_id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex justify-between gap-4">
                            <div>
                              <p className="font-bold text-slate-950">
                                {item.product_name}
                              </p>

                              <p className="mt-2 text-sm text-slate-700">
                                Date:{" "}
                                <span className="font-bold">
                                  {formatDate(item.item_date)}
                                </span>
                              </p>

                              <p className="text-sm text-slate-700">
                                {formatNumber(item.credits)} credits ×{" "}
                                {item.percentage}%
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-950">
                                {money(item.amount)}
                              </p>

                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    editInvoiceItem(item)
                                  }
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeInvoiceItem(item.temp_id)
                                  }
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <span className="font-bold text-slate-950">
                      Invoice Total
                    </span>

                    <span className="text-2xl font-bold text-blue-700">
                      {money(invoiceTotal)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={saveInvoice}
                    disabled={savingInvoice}
                    className="mt-4 w-full rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingInvoice
                      ? "Saving..."
                      : "Save Invoice"}
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="Payment History">
              {payments.length === 0 ? (
                <p className="text-sm font-medium text-slate-600">
                  No payments recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead>
                      <tr className="border-b border-slate-300 text-left text-sm font-bold text-slate-700">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Invoice</th>
                        <th className="pb-3">Method</th>
                        <th className="pb-3">Notes</th>
                        <th className="pb-3 text-right">Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-slate-200"
                        >
                          <td className="py-4 font-medium">
                            {formatDate(payment.payment_date)}
                          </td>

                          <td className="py-4 font-bold">
                            {payment.invoice_number || "-"}
                          </td>

                          <td className="py-4">
                            {payment.payment_method || "Cash"}
                          </td>

                          <td className="py-4 text-slate-600">
                            {payment.notes || "-"}
                          </td>

                          <td className="py-4 text-right font-bold text-green-700">
                            {money(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-xl font-bold text-slate-950">
        {title}
      </h2>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800">
        {label}
      </label>

      {children}
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "blue" | "green" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-700"
      : tone === "red"
      ? "text-red-700"
      : "text-blue-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <p className="text-sm font-bold text-slate-700">{title}</p>

      <p className={`mt-2 text-3xl font-bold ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function ProductRow({
  product,
  onSave,
  onDelete,
}: {
  product: ProductRate;
  onSave: (
    rateId: string,
    percentage: number
  ) => Promise<void>;
  onDelete: (
    product: ProductRate
  ) => Promise<void>;
}) {
  const [percentage, setPercentage] = useState(
    String(product.percentage)
  );

  useEffect(() => {
    setPercentage(String(product.percentage));
  }, [product.percentage]);

  return (
    <tr className="border-b border-slate-200">
      <td className="py-4 font-bold text-slate-950">
        {product.product_name}
      </td>

      <td className="py-4">
        <input
          type="number"
          min="0"
          step="0.01"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          className="w-28 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950"
        />
      </td>

      <td className="py-4">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              onSave(product.rate_id, Number(percentage))
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            Save
          </button>

          <button
            type="button"
            onClick={() => onDelete(product)}
            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const value = status?.toLowerCase();

  if (value === "paid") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase text-green-800">
        Paid
      </span>
    );
  }

  if (value === "partial") {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold uppercase text-yellow-800">
        Partial
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-800">
      Unpaid
    </span>
  );
}