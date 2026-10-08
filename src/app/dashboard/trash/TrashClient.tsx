"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { restoreAppeal, permanentDeleteAppeal, emptyTrash } from "./actions";

type TrashedItem = {
  id: string;
  source: "supabase" | "local";
  insurance_company?: string;
  date_of_service?: string;
  medical_code?: string;
  deleted_at?: string;
  patientAccount?: string;
  payerName?: string;
  dateOfService?: string;
  billedCPT?: string;
  denialCode?: string;
  deletedAt?: string;
};

const TRASH_EVENT = "reclaim-trash-change";

function textField(row: Record<string, unknown>, key: string): string | undefined {
  return typeof row[key] === "string" ? row[key] : undefined;
}

function readLocalTrash(): TrashedItem[] {
  try {
    const raw = window.localStorage.getItem("reclaim_eob_trash");
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "string") return [];
      return [
        {
          id: row.id,
          source: "local" as const,
          patientAccount: textField(row, "patientAccount"),
          payerName: textField(row, "payerName"),
          dateOfService: textField(row, "dateOfService"),
          billedCPT: textField(row, "billedCPT"),
          denialCode: textField(row, "denialCode"),
          deletedAt: textField(row, "deletedAt"),
        },
      ];
    });
  } catch {
    return [];
  }
}

function subscribeTrash(onStoreChange: () => void) {
  window.addEventListener(TRASH_EVENT, onStoreChange);
  return () => window.removeEventListener(TRASH_EVENT, onStoreChange);
}

function writeLocalTrash(items: TrashedItem[]) {
  window.localStorage.setItem(
    "reclaim_eob_trash",
    JSON.stringify(items.filter((item) => item.source === "local"))
  );
  window.dispatchEvent(new Event(TRASH_EVENT));
}

function serverItems(initialAppeals: unknown[]): TrashedItem[] {
  return initialAppeals.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string") return [];
    return [
      {
        id: row.id,
        source: "supabase" as const,
        insurance_company: textField(row, "insurance_company"),
        date_of_service: textField(row, "date_of_service"),
        medical_code: textField(row, "medical_code"),
        deleted_at: textField(row, "deleted_at"),
      },
    ];
  });
}

function display(item: TrashedItem) {
  if (item.source === "supabase") {
    return {
      label: "Letter",
      name: item.insurance_company || "Unknown payer",
      date: item.date_of_service || "No date",
      code: item.medical_code || "No code",
    };
  }
  return {
    label: "Claim",
    name: item.payerName || item.patientAccount || "Unknown claim",
    date: item.dateOfService || "No date",
    code: item.billedCPT || item.denialCode || "No code",
  };
}

export default function TrashClient({ initialAppeals }: { initialAppeals: unknown[] }) {
  const localItems = useSyncExternalStore(subscribeTrash, readLocalTrash, () => []);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrashedItem | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);
  const router = useRouter();
  const saved = serverItems(initialAppeals);
  const items = [...localItems, ...saved].filter((item) => !hiddenIds.includes(item.id));

  const restore = async (item: TrashedItem) => {
    if (item.source === "local") {
      const worklistRaw = window.localStorage.getItem("reclaim_eob_worklist");
      const worklist: unknown = worklistRaw ? JSON.parse(worklistRaw) : [];
      const nextWorklist = Array.isArray(worklist) ? worklist : [];
      nextWorklist.unshift({
        id: item.id,
        patientAccount: item.patientAccount,
        payerName: item.payerName,
        dateOfService: item.dateOfService,
        billedCPT: item.billedCPT,
        denialCode: item.denialCode,
      });
      window.localStorage.setItem("reclaim_eob_worklist", JSON.stringify(nextWorklist));
      writeLocalTrash(localItems.filter((row) => row.id !== item.id));
      toast.success("Claim restored to the worklist.");
      return;
    }
    setPendingId(item.id);
    const { success, error } = await restoreAppeal(item.id);
    setPendingId(null);
    if (!success) {
      toast.error(error ? `Couldn't restore: ${error}` : "Couldn't restore that letter.");
      return;
    }
    setHiddenIds((current) => [...current, item.id]);
    toast.success("Letter restored to history.");
    router.refresh();
  };

  const removeForever = async (item: TrashedItem) => {
    if (item.source === "local") {
      writeLocalTrash(localItems.filter((row) => row.id !== item.id));
      setDeleteTarget(null);
      toast.success("Claim deleted.");
      return;
    }
    setPendingId(item.id);
    const { success, error } = await permanentDeleteAppeal(item.id);
    setPendingId(null);
    if (!success) {
      toast.error(error ? `Couldn't delete: ${error}` : "Couldn't delete that letter.");
      return;
    }
    setHiddenIds((current) => [...current, item.id]);
    setDeleteTarget(null);
    toast.success("Letter deleted.");
    router.refresh();
  };

  const emptyBin = async () => {
    setEmptying(true);
    window.localStorage.removeItem("reclaim_eob_trash");
    window.dispatchEvent(new Event(TRASH_EVENT));
    if (saved.length > 0) {
      const { success, error } = await emptyTrash();
      if (!success) {
        setEmptying(false);
        toast.error(error ? `Couldn't empty the bin: ${error}` : "Couldn't empty the bin.");
        return;
      }
    }
    setHiddenIds(saved.map((item) => item.id));
    setEmptying(false);
    setEmptyOpen(false);
    toast.success("Recycle bin emptied.");
    router.refresh();
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
        <h2 className="text-xl font-medium text-white">Recycle bin is empty</h2>
        <p className="mx-auto mt-2 max-w-sm text-neutral-400">Deleted claims and letters show up here until you restore or delete them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => setEmptyOpen(true)} disabled={emptying} className="h-11 border-red-500/30 text-red-300">
          {emptying ? "Emptying…" : "Empty recycle bin"}
        </Button>
      </div>
      <ul className="space-y-3">
        {items.map((item) => {
          const shown = display(item);
          return (
            <li key={`${item.source}-${item.id}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge className="bg-white/10 text-neutral-200">{shown.label}</Badge>
                  <p className="mt-2 font-medium text-white">{shown.name}</p>
                  <p className="text-sm text-neutral-400">{shown.date} · {shown.code}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="h-11" disabled={pendingId === item.id} onClick={() => void restore(item)}>
                    {pendingId === item.id ? "Working…" : "Restore"}
                  </Button>
                  <Button type="button" variant="outline" className="h-11 border-red-500/30 text-red-300" disabled={pendingId === item.id} onClick={() => setDeleteTarget(item)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this item?"
        body="This cannot be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={!!deleteTarget && pendingId === deleteTarget.id}
        destructive
        onCancel={() => {
          if (!pendingId) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) void removeForever(deleteTarget);
        }}
      />
      <ConfirmDialog
        open={emptyOpen}
        title="Empty the recycle bin?"
        body="Every item in the bin is deleted. This cannot be undone."
        confirmLabel="Empty bin"
        pendingLabel="Emptying…"
        pending={emptying}
        destructive
        onCancel={() => {
          if (!emptying) setEmptyOpen(false);
        }}
        onConfirm={() => {
          void emptyBin();
        }}
      />
    </div>
  );
}
