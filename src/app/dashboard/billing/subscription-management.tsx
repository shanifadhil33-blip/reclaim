"use client";

import { useState } from "react";

type SubscriptionDetails = {
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  amount: number | null;
  currency: string | null;
  recurringInterval: string | null;
  productName: string | null;
};

export function SubscriptionManagement({
  subscription,
}: {
  subscription: SubscriptionDetails;
}) {
  const [isCanceling, setIsCanceling] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelComment, setCancelComment] = useState("");
  const [localCancelAtPeriodEnd, setLocalCancelAtPeriodEnd] = useState(
    subscription.cancelAtPeriodEnd
  );

  const renewalDate = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const periodStart = subscription.currentPeriodStart
    ? new Date(subscription.currentPeriodStart).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const formattedAmount =
    subscription.amount !== null
      ? `$${(subscription.amount / 100).toFixed(0)}`
      : "$19";

  const interval = subscription.recurringInterval === "year" ? "year" : "month";

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      const res = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || undefined,
          comment: cancelComment || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");

      setLocalCancelAtPeriodEnd(true);
      setShowCancelDialog(false);
    } catch (err: any) {
      alert(err.message || "Failed to cancel subscription. Please try again.");
    } finally {
      setIsCanceling(false);
    }
  };

  const handleOpenPortal = async () => {
    setIsLoadingPortal(true);
    try {
      const res = await fetch("/api/customer-portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open portal");

      window.open(data.portalUrl, "_blank");
    } catch (err: any) {
      alert(
        err.message || "Failed to open billing portal. Please try again."
      );
    } finally {
      setIsLoadingPortal(false);
    }
  };

  return (
    <>
      {/* Subscription Details Card */}
      <div className="md:col-span-2 shadow-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-white rounded-xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/8 blur-[100px]" />

        <div className="flex items-center gap-3 mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neutral-400"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <h2 className="text-lg font-semibold text-white">
            Subscription Management
          </h2>
        </div>

        {/* Status Banner */}
        {localCancelAtPeriodEnd && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-400 shrink-0"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <div>
              <p className="text-amber-300 text-sm font-medium">
                Cancellation Scheduled
              </p>
              <p className="text-amber-400/70 text-xs">
                Your subscription will end on {renewalDate}. You'll keep full
                access until then.
              </p>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
          <div className="space-y-1">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
              Plan
            </p>
            <p className="text-white font-semibold">
              {subscription.productName || "Pro"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
              Amount
            </p>
            <p className="text-white font-semibold">
              {formattedAmount}
              <span className="text-neutral-400 text-sm font-normal">
                /{interval}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
              Billing Period
            </p>
            <p className="text-white font-semibold text-sm">
              {periodStart && periodEnd
                ? `${periodStart} — ${periodEnd}`
                : "N/A"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
              {localCancelAtPeriodEnd ? "Ends On" : "Renews On"}
            </p>
            <p
              className={`font-semibold ${localCancelAtPeriodEnd ? "text-amber-400" : "text-white"}`}
            >
              {renewalDate}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Manage Payment Methods */}
          <button
            onClick={handleOpenPortal}
            disabled={isLoadingPortal}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 text-sm font-medium rounded-lg border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingPortal ? (
              <div className="w-4 h-4 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            )}
            Manage Payment Methods
          </button>

          {/* Cancel Subscription */}
          {!localCancelAtPeriodEnd && (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 text-sm font-medium rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" x2="9" y1="9" y2="15" />
                <line x1="9" x2="15" y1="9" y2="15" />
              </svg>
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isCanceling && setShowCancelDialog(false)}
        >
          <div
            className="w-full max-w-md mx-4 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-400"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Cancel Subscription?
                </h3>
                <p className="text-neutral-400 text-xs">
                  This action can be undone by resubscribing.
                </p>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg border border-white/10 p-4 mb-5">
              <p className="text-sm text-neutral-300 leading-relaxed">
                Your subscription will remain active until{" "}
                <span className="text-white font-semibold">{renewalDate}</span>.
                After that, you'll lose access to Pro features.
              </p>
            </div>

            {/* Optional Reason */}
            <div className="space-y-3 mb-5">
              <label className="block">
                <span className="text-xs text-neutral-400 font-medium">
                  Reason for canceling (optional)
                </span>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mt-1.5 w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-neutral-200 text-sm focus:border-indigo-500 focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select a reason...</option>
                  <option value="too_expensive">Too expensive</option>
                  <option value="missing_features">Missing features I need</option>
                  <option value="switched_service">Switched to another service</option>
                  <option value="unused">Not using it enough</option>
                  <option value="customer_service">Customer service issues</option>
                  <option value="too_complex">Too complex to use</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-neutral-400 font-medium">
                  Additional feedback (optional)
                </span>
                <textarea
                  value={cancelComment}
                  onChange={(e) => setCancelComment(e.target.value)}
                  placeholder="We'd love to know how we can improve..."
                  rows={2}
                  className="mt-1.5 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-neutral-200 text-sm focus:border-indigo-500 focus:outline-none transition-colors resize-none placeholder:text-neutral-600"
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                disabled={isCanceling}
                className="flex-1 h-10 rounded-lg text-sm font-medium border border-white/10 text-neutral-300 hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancel}
                disabled={isCanceling}
                className="flex-1 h-10 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCanceling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-300/30 border-t-white rounded-full animate-spin" />
                    Canceling...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
