"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { softDeleteAppeal, clearAllHistory } from "./actions";

export function DeleteAppealButton({ appealId, onDeleted }: { appealId: string; onDeleted?: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const remove = async () => {
    setPending(true);
    setError(null);
    const { success } = await softDeleteAppeal(appealId);
    if (!success) {
      setPending(false);
      setError("Couldn't move it to the recycle bin.");
      return;
    }
    setPending(false);
    setOpen(false);
    toast.success("Letter moved to the recycle bin.");
    if (onDeleted) onDeleted();
    else router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setError(null);
          setOpen(true);
        }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-500/10 hover:text-red-300"
        aria-label="Move letter to recycle bin"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
      </button>
      <ConfirmDialog
        open={open}
        title="Move this letter to the recycle bin?"
        body="You can restore it from the recycle bin."
        confirmLabel="Move to bin"
        pendingLabel="Moving…"
        pending={pending}
        error={error}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={() => {
          void remove();
        }}
      />
    </>
  );
}

export function ClearAllAppealsButton() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const clear = async () => {
    setPending(true);
    setError(null);
    const { success } = await clearAllHistory();
    if (!success) {
      setPending(false);
      setError("Couldn't clear history.");
      return;
    }
    toast.success("History moved to the recycle bin.");
    setOpen(false);
    setPending(false);
    router.refresh();
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => { setError(null); setOpen(true); }} className="h-11 border-red-500/30 text-red-300">
        Clear history
      </Button>
      <ConfirmDialog
        open={open}
        title="Move all letters to the recycle bin?"
        body="You can restore them one by one from the recycle bin."
        confirmLabel="Move all"
        pendingLabel="Moving…"
        pending={pending}
        error={error}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={() => {
          void clear();
        }}
      />
    </>
  );
}
