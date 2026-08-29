import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src="/vendorinvoice-logo.png"
              alt="VendorInvoice"
              width={180}
              height={70}
              priority
              className="h-14 w-auto rounded-lg bg-white object-contain px-2 py-1"
            />

            <div className="hidden sm:block">
              <p className="text-xs text-slate-400">
                Buyer & Invoice Management
              </p>
            </div>
          </Link>

          <div className="flex gap-3">
            <Link
              href="/sign-in"
              className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-bold hover:bg-slate-900"
            >
              Sign In
            </Link>

            <Link
              href="/sign-up"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold hover:bg-blue-500"
            >
              Create Account
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <Image
            src="/vendorinvoice-logo.png"
            alt="VendorInvoice"
            width={420}
            height={180}
            priority
            className="mx-auto mb-10 h-auto w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl"
          />

          <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-400">
            Simple Business Tracking
          </p>

          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            Manage buyers, invoices, payments, and balances in one place.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            VendorInvoice gives you a simple way to track
            buyer-specific product rates, credits, invoices,
            payments, and outstanding balances without complicated
            spreadsheets.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link
              href="/sign-up"
              className="rounded-xl bg-blue-600 px-8 py-4 font-black text-white hover:bg-blue-500"
            >
              Create Free Account
            </Link>

            <Link
              href="/sign-in"
              className="rounded-xl border border-slate-700 bg-slate-900 px-8 py-4 font-black text-white hover:bg-slate-800"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <FeatureCard
            number="1"
            title="Add Your Buyers"
            text="Create separate buyer accounts and keep each customer's activity organized."
          />

          <FeatureCard
            number="2"
            title="Set Individual Rates"
            text="Give each buyer different products and percentage rates based on your agreement."
          />

          <FeatureCard
            number="3"
            title="Create Invoices"
            text="Enter credits and rates and let the app calculate invoice totals automatically."
          />

          <FeatureCard
            number="4"
            title="Track Payments"
            text="Record payments and instantly see what has been paid and what is still owed."
          />
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/60">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
                How It Works
              </p>

              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                A simple workflow from buyer to payment.
              </h2>

              <p className="mt-4 max-w-xl leading-7 text-slate-300">
                Everything starts with a buyer. Add their products,
                set the correct percentages, create invoices as you
                provide credits, then record payments when money is
                received.
              </p>
            </div>

            <div className="space-y-4">
              <WorkflowRow
                step="01"
                title="Create a buyer"
                text="Add the person or business you work with."
              />

              <WorkflowRow
                step="02"
                title="Add products and percentages"
                text="Set the exact rate for each product for that buyer."
              />

              <WorkflowRow
                step="03"
                title="Create the invoice"
                text="Enter dates and credits and your amount is calculated."
              />

              <WorkflowRow
                step="04"
                title="Record payments"
                text="Keep the outstanding balance updated automatically."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          <InfoCard
            icon="📊"
            title="Clear Dashboard"
            text="See total invoiced, total paid, and outstanding balances without searching through multiple files."
          />

          <InfoCard
            icon="🧾"
            title="Invoice History"
            text="Keep a history of invoices for every buyer and review them whenever you need."
          />

          <InfoCard
            icon="🔒"
            title="Private Accounts"
            text="Each signed-in account has its own buyers, invoices, payments, rates, and account information."
          />
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-blue-600 p-8 text-center sm:p-12">
          <h2 className="text-3xl font-black">
            Ready to organize your buyer accounts?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-blue-100">
            Create your account, add your first buyer, and start
            tracking invoices and payments from one dashboard.
          </p>

          <Link
            href="/sign-up"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-4 font-black text-blue-700 hover:bg-blue-50"
          >
            Create Account
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-7 text-sm text-slate-500 sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/vendorinvoice-logo.png"
              alt="VendorInvoice"
              width={120}
              height={45}
              className="h-10 w-auto rounded-md bg-white object-contain px-1"
            />

            <span>VendorInvoice</span>
          </div>

          <div className="flex gap-5">
            <Link
              href="/sign-in"
              className="hover:text-white"
            >
              Sign In
            </Link>

            <Link
              href="/sign-up"
              className="hover:text-white"
            >
              Create Account
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 font-black">
        {number}
      </div>

      <h3 className="mt-5 text-xl font-black">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {text}
      </p>
    </div>
  );
}

function WorkflowRow({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-sm font-black text-blue-400">
        {step}
      </div>

      <div>
        <h3 className="font-black">
          {title}
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          {text}
        </p>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="text-3xl">
        {icon}
      </div>

      <h3 className="mt-4 text-xl font-black">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {text}
      </p>
    </div>
  );
}