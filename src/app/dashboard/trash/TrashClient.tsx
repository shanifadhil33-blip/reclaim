"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { restoreAppeal, permanentDeleteAppeal, emptyTrash } from "./actions";

interface TrashedItem {
  id: string;
  // Supabase appeal fields
  insurance_company?: string;
  date_of_service?: string;
  medical_code?: string;
  deleted_at?: string;
  // localStorage worklist fields
  patientAccount?: string;
  patientName?: string;
  dateOfService?: string;
  billedCPT?: string;
  denialCode?: string;
  denialReason?: string;
  payerName?: string;
  deletedAt?: string;
  source?: "supabase" | "local";
}

export default function TrashClient({ initialAppeals }: { initialAppeals: any[] }) {
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isEmptying, setIsEmptying] = useState(false);
  const router = useRouter();

  // Merge Supabase appeals and localStorage worklist trash
  useEffect(() => {
    const supabaseItems: TrashedItem[] = (initialAppeals || []).map(a => ({
      ...a,
      source: "supabase" as const,
    }));

    let localItems: TrashedItem[] = [];
    try {
      const raw = localStorage.getItem("reclaim_eob_trash");
      if (raw) {
        localItems = JSON.parse(raw).map((item: any) => ({
          ...item,
          source: "local" as const,
        }));
      }
    } catch (e) {
      console.error("Failed to parse recycle bin localStorage");
    }

    setItems([...localItems, ...supabaseItems]);
  }, [initialAppeals]);

  const handleRestore = async (item: TrashedItem) => {
    if (item.source === "local") {
      // Restore back to worklist localStorage
      try {
        const worklist = JSON.parse(localStorage.getItem("reclaim_eob_worklist") || "[]");
        const { deletedAt, source, ...cleanItem } = item;
        worklist.unshift(cleanItem);
        localStorage.setItem("reclaim_eob_worklist", JSON.stringify(worklist));

        // Remove from trash localStorage
        const trash = JSON.parse(localStorage.getItem("reclaim_eob_trash") || "[]");
        localStorage.setItem("reclaim_eob_trash", JSON.stringify(trash.filter((t: any) => t.id !== item.id)));

        setItems(prev => prev.filter(i => i.id !== item.id));
        toast.success("Claim restored to worklist. Refresh the dashboard to see it.");
      } catch (e) {
        toast.error("Failed to restore claim.");
      }
      return;
    }

    // Supabase restore
    setRestoringId(item.id);
    const { success, error } = await restoreAppeal(item.id);
    setRestoringId(null);

    if (success) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success("Appeal restored to history.");
      router.refresh();
    } else {
      toast.error("Failed to restore: " + error);
    }
  };

  const handleDelete = async (item: TrashedItem) => {
    if (!confirm("Permanently delete this item? This cannot be undone.")) return;

    if (item.source === "local") {
      const trash = JSON.parse(localStorage.getItem("reclaim_eob_trash") || "[]");
      localStorage.setItem("reclaim_eob_trash", JSON.stringify(trash.filter((t: any) => t.id !== item.id)));
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success("Permanently deleted.");
      return;
    }

    setDeletingId(item.id);
    const { success, error } = await permanentDeleteAppeal(item.id);
    setDeletingId(null);

    if (success) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success("Appeal permanently deleted.");
      router.refresh();
    } else {
      toast.error("Failed to delete: " + error);
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Permanently delete ALL items in the Recycle Bin? This cannot be undone.")) return;

    setIsEmptying(true);

    // Clear localStorage trash
    localStorage.removeItem("reclaim_eob_trash");

    // Clear Supabase trash
    const supabaseItems = items.filter(i => i.source === "supabase");
    if (supabaseItems.length > 0) {
      const { success, error } = await emptyTrash();
      if (!success) {
        toast.error("Failed to empty Supabase trash: " + error);
        setIsEmptying(false);
        return;
      }
    }

    setItems([]);
    setIsEmptying(false);
    toast.success("Recycle Bin emptied.");
    router.refresh();
  };

  // Helper to get display values for both sources
  const getDisplay = (item: TrashedItem) => {
    if (item.source === "supabase") {
      return {
        label: "Appeal",
        name: item.insurance_company || "Unknown",
        date: item.date_of_service || "N/A",
        code: item.medical_code || "N/A",
        deletedOn: item.deleted_at ? new Date(item.deleted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A",
      };
    }
    return {
      label: "Claim",
      name: item.payerName || item.patientAccount || "Unknown",
      date: item.dateOfService || "N/A",
      code: item.billedCPT || item.denialCode || "N/A",
      deletedOn: item.deletedAt ? new Date(item.deletedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A",
    };
  };

  if (items.length === 0) {
    return (
      <div className="bg-neutral-900/30 border border-white/5 rounded-xl p-12 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-20 text-white"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        <h3 className="text-xl font-medium text-white mb-2">Recycle Bin is Empty</h3>
        <p className="text-neutral-500 max-w-sm mx-auto">
          Deleted claims and appeals will appear here so you can restore them if needed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleEmptyTrash} 
          disabled={isEmptying}
          className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          {isEmptying ? "Emptying..." : "Empty Recycle Bin"}
        </Button>
      </div>

      <div className="bg-neutral-900/50 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-400 uppercase bg-[#0f172a] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Type</th>
                <th className="px-6 py-4 font-medium tracking-wider">Payer / Patient</th>
                <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                <th className="px-6 py-4 font-medium tracking-wider">Code</th>
                <th className="px-6 py-4 font-medium tracking-wider">Deleted On</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => {
                const d = getDisplay(item);
                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`text-xs ${item.source === "local" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"}`}>
                        {d.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-300">{d.name}</div>
                    </td>
                    <td className="px-6 py-4 text-neutral-400">{d.date}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 font-mono">
                        {d.code}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">{d.deletedOn}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRestore(item)}
                          disabled={restoringId === item.id}
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        >
                          {restoringId === item.id ? "Restoring..." : "Restore"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          {deletingId === item.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
