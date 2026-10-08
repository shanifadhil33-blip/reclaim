"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { clearLocalClaimData } from "@/lib/local-claim-data";

export function SignOutButton() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/auth/signout", { method: "POST" });
      if (!response.ok) throw new Error("sign out failed");
      clearLocalClaimData();
      window.location.replace("/");
    } catch {
      setPending(false);
      setError("Couldn't sign out. Try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex h-11 items-center rounded-lg border border-white/15 px-4 text-sm font-medium text-neutral-200 hover:bg-white/5"
      >
        Sign out
      </button>
      <ConfirmDialog
        open={open}
        title="Sign out of Reclaim?"
        body="You will need to sign in again to see your letters. Denial rows saved only on this device are cleared."
        confirmLabel="Sign out"
        pendingLabel="Signing out…"
        pending={pending}
        error={error}
        onCancel={() => {
          if (pending) return;
          setOpen(false);
          setError(null);
        }}
        onConfirm={() => {
          void signOut();
        }}
      />
    </>
  );
}
