"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Invoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  subtotal: number;
  amount_paid: number;
  status: string;
  vendor_id: string;
};

type Buyer = {
  id: string;
  name: string;
};

type InvoiceItem = {
  id: string;
  game_name: string;
  item_date: string;
  credits: number;
  percentage: number;
  amount: number;
};

type Payment = {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function number(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function ViewInvoicePage() {
  const pathname = usePathname();

  const invoiceId = pathname
    ? pathname.split("/").filter(Boolean).pop() || ""
    : "";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvoice() {
      if (!invoiceId) {
        setError("Invoice ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const { data: invoiceData, error: invoiceError } =
          await supabase
            .from("invoices")
            .select(
              "id, invoice_number, invoice_date, subtotal, amount_paid, status, vendor_id"
            )
            .eq("id", invoiceId)
            .maybeSingle();

        if (invoiceError) throw invoiceError;

        if (!invoiceData) {
          throw new Error("Invoice not found.");
        }

        const loadedInvoice: Invoice = {
          id: invoiceData.id,
          invoice_number: invoiceData.invoice_number,
          invoice_date: invoiceData.invoice_date,
          subtotal: Number(invoiceData.subtotal || 0),
          amount_paid: Number(invoiceData.amount_paid || 0),
          status: invoiceData.status,
          vendor_id: invoiceData.vendor_id,
        };

        setInvoice(loadedInvoice);

        const { data: buyerData, error: buyerError } =
          await supabase
            .from("vendors")
            .select("id, name")
            .eq("id", invoiceData.vendor_id)
            .maybeSingle();

        if (buyerError) throw buyerError;

        if (buyerData) {
          setBuyer({
            id: buyerData.id,
            name: buyerData.name,
          });
        }

        const { data: itemData, error: itemError } =
          await supabase
            .from("invoice_items")
            .select(
              "id, game_name, item_date, credits, percentage, amount, created_at"
            )
            .eq("invoice_id", invoiceId)
            .order("item_date", { ascending: true })
            .order("created_at", { ascending: true });

        if (itemError) throw itemError;

        setItems(
          (itemData ?? []).map((item: any) => ({
            id: item.id,
            game_name: item.game_name,
            item_date:
              item.item_date || invoiceData.invoice_date,
            credits: Number(item.credits || 0),
            percentage: Number(item.percentage || 0),
            amount: Number(item.amount || 0),
          }))
        );

        const { data: paymentData, error: paymentError } =
          await supabase
            .from("payments")
            .select(
              "id, payment_date, amount, payment_method"
            )
            .eq("invoice_id", invoiceId)
            .order("payment_date", { ascending: true });

        if (paymentError) throw paymentError;

        setPayments(
          (paymentData ?? []).map((payment: any) => ({
            id: payment.id,
            payment_date: payment.payment_date,
            amount: Number(payment.amount || 0),
            payment_method: payment.payment_method || "Cash",
          }))
        );
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Unable to load invoice.");
      } finally {
        setLoading(false);
      }
    }

    loadInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="font-semibold text-slate-800">
            Loading invoice...
          </p>
        </div>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-10 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">
            Invoice Not Found
          </h1>

          <p className="mt-3 text-red-700">
            {error || "Unable to find this invoice."}
          </p>

          <Link
            href="/"
            className="mt-6 inline-block font-semibold text-blue-700 hover:underline"
          >
            ← Back to Buyers
          </Link>
        </div>
      </main>
    );
  }

  const balance = invoice.subtotal - invoice.amount_paid;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          {buyer && (
            <Link
              href={`/buyers/${buyer.id}`}
              className="font-semibold text-slate-700 hover:text-slate-950"
            >
              ← Back to {buyer.name}
            </Link>
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Edit Invoice
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-blue-700"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="bg-slate-950 px-10 py-9 text-white">
          <div className="flex items-start justify-between gap-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
                Buyer
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight text-white">
                {buyer?.name || "Buyer"}
              </h1>

              <p className="mt-3 text-lg font-semibold text-slate-300">
                INVOICE
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Invoice Number
              </p>

              <p className="mt-1 text-2xl font-black text-white">
                {invoice.invoice_number}
              </p>

              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Invoice Date
              </p>

              <p className="mt-1 font-bold text-white">
                {formatDate(invoice.invoice_date)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-10 py-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Invoice Details
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              {buyer?.name || "Buyer"}
            </h2>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-700">
                    Date
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-700">
                    Product
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-700">
                    Credits
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-700">
                    Rate
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-700">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-200"
                  >
                    <td className="px-5 py-5 text-sm font-bold text-slate-800">
                      {formatDate(item.item_date)}
                    </td>

                    <td className="px-5 py-5">
                      <p className="font-bold text-slate-950">
                        {item.game_name}
                      </p>
                    </td>

                    <td className="px-5 py-5 text-right font-semibold text-slate-800">
                      {number(item.credits)}
                    </td>

                    <td className="px-5 py-5 text-right font-semibold text-slate-800">
                      {item.percentage}%
                    </td>

                    <td className="px-5 py-5 text-right font-black text-slate-950">
                      {money(item.amount)}
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center font-medium text-slate-500"
                    >
                      No invoice items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between border-b border-slate-200 py-3">
                <span className="font-semibold text-slate-600">
                  Invoice Total
                </span>

                <span className="font-bold text-slate-950">
                  {money(invoice.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 py-3">
                <span className="font-semibold text-slate-600">
                  Paid
                </span>

                <span className="font-bold text-green-700">
                  {money(invoice.amount_paid)}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 px-5 py-5 text-white">
                <span className="font-bold text-white">
                  Balance Due
                </span>

                <span className="text-2xl font-black text-white">
                  {money(balance)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Payment Status
              </p>

              <div className="mt-2">
                <StatusBadge status={invoice.status} />
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-slate-500">
                Thank you
              </p>
            </div>
          </div>

          {payments.length > 0 && (
            <div className="mt-10">
              <h3 className="text-lg font-black text-slate-950">
                Payments
              </h3>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-600">
                        Date
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-600">
                        Method
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase text-slate-600">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-t border-slate-200"
                      >
                        <td className="px-5 py-4 font-medium text-slate-700">
                          {formatDate(payment.payment_date)}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {payment.payment_method || "Cash"}
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-green-700">
                          {money(payment.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-10 py-6 text-center">
          <p className="text-sm font-semibold text-slate-600">
            Thank you for your business.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 0;
          }

          html,
          body {
            background: white !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const value = status?.toLowerCase();

  if (value === "paid") {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-800">
        Paid
      </span>
    );
  }

  if (value === "partial") {
    return (
      <span className="inline-flex rounded-full bg-yellow-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellow-800">
        Partial
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-red-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-red-800">
      Unpaid
    </span>
  );
}