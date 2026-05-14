"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { softDeleteAppeal, clearAllHistory } from "./actions";

export function DeleteAppealButton({ appealId, onDeleted }: { appealId: string; onDeleted?: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Move this appeal to the Recycle Bin? You can restore it later.")) return;
    
    setIsDeleting(true);
    const { success, error } = await softDeleteAppeal(appealId);
    
    if (!success) {
      toast.error("Failed to delete appeal: " + error);
      setIsDeleting(false);
    } else {
      toast.success("Appeal moved to Recycle Bin.");
      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleDelete();
      }}
      disabled={isDeleting}
      className="text-neutral-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded transition-colors disabled:opacity-50"
      title="Delete Appeal"
    >
      {isDeleting ? (
        <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      )}
    </button>
  );
}

export function ClearAllAppealsButton() {
  const [isClearing, setIsClearing] = useState(false);
  const router = useRouter();

  const handleClearAll = async () => {
    if (!confirm("Move ALL appeal history to the Recycle Bin? You can restore them later.")) return;
    
    setIsClearing(true);
    const { success, error } = await clearAllHistory();
    
    if (!success) {
      toast.error("Failed to clear history: " + error);
      setIsClearing(false);
    } else {
      toast.success("All history moved to Recycle Bin.");
      router.refresh();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClearAll}
      disabled={isClearing}
      className="bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
    >
      {isClearing ? "Clearing..." : "Clear All History"}
    </Button>
  );
}
