"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SubscriptionGuardProps = {
  children: ReactNode;
};

export default function SubscriptionGuard({
  children,
}: SubscriptionGuardProps) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (userError || !user) {
          router.replace("/sign-in");
          return;
        }

        // Admin accounts always have access.
        const { data: adminData, error: adminError } = await supabase
          .from("app_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (adminError) {
          console.error("ADMIN CHECK ERROR:", adminError);
        }

        if (adminData) {
          if (!mounted) return;

          setAllowed(true);
          setChecking(false);
          return;
        }

        // Regular account: check trial/subscription.
        const {
          data: subscriptionData,
          error: subscriptionError,
        } = await supabase
          .from("account_subscriptions")
          .select(
            "status, trial_ends_at, subscription_ends_at"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (subscriptionError || !subscriptionData) {
          router.replace("/billing");
          return;
        }

        const now = Date.now();

        const trialEnd = subscriptionData.trial_ends_at
          ? new Date(subscriptionData.trial_ends_at).getTime()
          : 0;

        const subscriptionEnd =
          subscriptionData.subscription_ends_at
            ? new Date(
                subscriptionData.subscription_ends_at
              ).getTime()
            : 0;

        const trialActive =
          subscriptionData.status === "trial" &&
          trialEnd > now;

        const subscriptionActive =
          subscriptionData.status === "active" &&
          subscriptionEnd > now;

        if (!trialActive && !subscriptionActive) {
          router.replace("/billing");
          return;
        }

        if (!mounted) return;

        setAllowed(true);
        setChecking(false);
      } catch (err) {
        console.error("SUBSCRIPTION GUARD ERROR:", err);

        if (mounted) {
          router.replace("/billing");
        }
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking || !allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-10 py-8 text-center shadow-sm">
          <p className="font-semibold text-slate-700">
            Checking subscription...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}