import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Polar } from "@polar-sh/sdk";
import { SubscriptionManagement } from "./subscription-management";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("trial_ends_at, subscription_status, polar_subscription_id")
    .eq("id", user.id)
    .single();

  // Server-side verification: if DB says not active, check Polar directly
  let verifiedStatus = profile?.subscription_status;
  
  // Full subscription details for the management card
  let subscriptionDetails: {
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    currentPeriodStart: string | null;
    amount: number | null;
    currency: string | null;
    recurringInterval: string | null;
    productName: string | null;
  } | null = null;
  
  if (process.env.POLAR_API_TOKEN) {
    try {
      const polar = new Polar({ accessToken: process.env.POLAR_API_TOKEN });
      
      // Try by subscription ID first
      if (profile?.polar_subscription_id) {
        try {
          const sub = await polar.subscriptions.get({ id: profile.polar_subscription_id });
          if (sub) {
            if (sub.status === 'active' || sub.status === 'trialing') {
              verifiedStatus = 'active';
              
              // Sync to DB if not already active
              if (profile?.subscription_status !== 'active') {
                const adminSupabase = createAdminClient();
                await adminSupabase.from('profiles').update({ subscription_status: 'active' }).eq('id', user.id);
              }
            }
            
            // Populate subscription details for the management UI
            subscriptionDetails = {
              status: sub.status,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
              currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
              currentPeriodStart: sub.currentPeriodStart ? sub.currentPeriodStart.toISOString() : null,
              amount: sub.amount ?? null,
              currency: sub.currency ?? null,
              recurringInterval: sub.recurringInterval ?? null,
              productName: sub.product?.name ?? null,
            };
          }
        } catch { /* subscription lookup failed */ }
      }

      // Fallback: look up by email
      if (verifiedStatus !== 'active' && user.email) {
        try {
          const customersResult = await polar.customers.list({ email: user.email });
          for await (const page of customersResult) {
            const customers = page.result?.items || [];
            for (const customer of customers) {
              const subsResult = await polar.subscriptions.list({ customerId: customer.id, active: true });
              for await (const subPage of subsResult) {
                const subs = subPage.result?.items || [];
                for (const sub of subs) {
                  if (sub.status === 'active' || sub.status === 'trialing') {
                    verifiedStatus = 'active';
                    const adminSupabase = createAdminClient();
                    await adminSupabase.from('profiles').update({ 
                      subscription_status: 'active',
                      polar_subscription_id: sub.id 
                    }).eq('id', user.id);
                    
                    // Populate subscription details
                    subscriptionDetails = {
                      status: sub.status,
                      cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
                      currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
                      currentPeriodStart: sub.currentPeriodStart ? sub.currentPeriodStart.toISOString() : null,
                      amount: sub.amount ?? null,
                      currency: sub.currency ?? null,
                      recurringInterval: sub.recurringInterval ?? null,
                      productName: sub.product?.name ?? null,
                    };
                    break;
                  }
                }
                if (verifiedStatus === 'active') break;
              }
              if (verifiedStatus === 'active') break;
            }
            if (verifiedStatus === 'active') break;
          }
        } catch { /* email lookup failed */ }
      }
    } catch (e) {
      console.error('[BILLING] Polar verification failed:', e);
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL || "#";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const checkoutUrl = baseUrl !== "#" && user.email 
    ? `${baseUrl}?customer_email=${encodeURIComponent(user.email)}&metadata[user_id]=${user.id}&success_url=${encodeURIComponent(`${appUrl}/dashboard/billing`)}` 
    : baseUrl;
  const now = new Date();
  
  const fallbackTrialEnds = new Date(new Date(user.created_at).getTime() + 14 * 24 * 60 * 60 * 1000);
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : fallbackTrialEnds;
  
  const diffTime = trialEndsAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = diffDays <= 0;
  const isPremium = verifiedStatus === "active";


  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-6 group">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
          Back to Dashboard
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">Billing & Subscription</h1>
        <p className="text-neutral-400">Manage your subscription and payment method.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Current Status Card */}
        <div className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-white rounded-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px]" />
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          
          {isPremium ? (
            <>
              <h2 className="text-xl font-semibold text-emerald-400 mb-2">Pro Subscription Active</h2>
              <p className="text-neutral-400 text-sm leading-relaxed">Your account is fully unlocked. All features are available with no limits.</p>
            </>
          ) : isExpired ? (
            <>
              <h2 className="text-xl font-semibold text-red-400 mb-2">Free Trial Expired</h2>
              <p className="text-neutral-400 text-sm leading-relaxed">Your 14-day trial has ended. Upgrade to Pro to continue generating appeal letters.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-neutral-200 mb-2">Free Trial Active</h2>
              <p className="text-neutral-400 text-sm leading-relaxed">You have <span className="text-white font-bold">{diffDays} {diffDays === 1 ? "day" : "days"}</span> remaining in your free trial. All features are unlocked.</p>
            </>
          )}
        </div>

        {/* Pro Plan Card */}
        <div className="shadow-2xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-xl text-white rounded-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/15 blur-[80px]" />
          
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-4xl font-extrabold tracking-tight text-white">$19</span>
            <span className="text-neutral-400 text-sm font-medium">/ month</span>
          </div>
          <h3 className="text-lg font-semibold text-indigo-300 mb-4">Pro Plan</h3>
          
          <ul className="space-y-3 mb-8 text-sm text-neutral-300">
            <li className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
              <span><strong className="text-white">Unlimited PDF EOB uploads</strong> — Process as many Explanation of Benefits documents as you need</span>
            </li>
            <li className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
              <span><strong className="text-white">Automated Vision AI extraction</strong> — Denied claims are identified and extracted automatically</span>
            </li>
            <li className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
              <span><strong className="text-white">Unlimited appeal letter generations</strong> — AI-powered, legally persuasive appeal letters</span>
            </li>
            <li className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
              <span><strong className="text-white">Full appeal history & export</strong> — Copy, download, and manage all your letters</span>
            </li>
          </ul>

          {!isPremium && (
            <Link href={checkoutUrl} className="inline-flex items-center justify-center font-semibold h-12 px-8 text-sm bg-indigo-500 text-white hover:bg-indigo-400 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_25px_rgba(99,102,241,0.4)] rounded-full w-full">
              {isExpired ? "Upgrade to Pro" : "Upgrade Now"}
            </Link>
          )}

          {isPremium && (
            <div className="text-center py-3 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-sm">
              ✓ You&apos;re on the Pro Plan
            </div>
          )}
          
          <p className="text-xs text-neutral-500 text-center mt-4">Cancel anytime. No long-term contracts.</p>
        </div>

        {/* Subscription Management — only visible to Pro users */}
        {isPremium && subscriptionDetails && (
          <SubscriptionManagement subscription={subscriptionDetails} />
        )}
      </div>
    </div>
  );
}
