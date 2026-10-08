"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { OptionMenu } from "@/components/option-menu";
import { PortfolioNotice } from "@/components/portfolio-notice";
import { PublicShell } from "@/components/public-shell";
import { DEMO_CLAIMS, sortDemoClaims } from "@/lib/demo-data";
import type { DenialRow } from "@/stores/extraction-store";

const SORTS = [
  { value: "found", label: "Newest sample" },
  { value: "patient", label: "Patient name" },
  { value: "payer", label: "Payer name" },
  { value: "amount", label: "Amount, high to low" },
];

const FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Letter ready" },
  { value: "needs_notes", label: "Needs notes" },
];

function DemoScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = SORTS.some((item) => item.value === searchParams.get("sort"))
    ? (searchParams.get("sort") as string)
    : "found";
  const status = FILTERS.some((item) => item.value === searchParams.get("status"))
    ? (searchParams.get("status") as string)
    : "all";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [resetOpen, setResetOpen] = useState(false);

  const rows = useMemo(() => {
    const filtered = DEMO_CLAIMS.filter((row) => status === "all" || row.status === status);
    return sortDemoClaims(filtered, sort);
  }, [sort, status]);

  const selected = rows.find((row) => row.id === selectedId) ?? DEMO_CLAIMS.find((row) => row.id === selectedId) ?? null;
  const letter = selected ? (drafts[selected.id] ?? selected.generatedLetter) : "";

  function setParam(key: "sort" | "status", value: string, fallback: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === fallback) params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function copyLetter() {
    if (!letter) return;
    void navigator.clipboard.writeText(letter);
    toast.success("Copied the fictional letter.");
  }

  function downloadLetter(row: DenialRow) {
    if (!letter) return;
    const link = document.createElement("a");
    const blob = new Blob([letter], { type: "text/plain" });
    link.href = URL.createObjectURL(blob);
    link.download = `Fictional_Appeal_${row.patientAccount}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    toast.success("Downloaded the fictional letter.");
  }

  return (
    <PublicShell back={{ href: "/", label: "Home" }}>
      <div className="space-y-6">
        <PortfolioNotice className="rounded-2xl" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Fictional denial demo</h1>
          <p className="mt-2 max-w-2xl text-neutral-400">
            Four made-up claims. Open one, edit the sample letter, then copy or download it. Nothing here is a real patient, and nothing is saved to an account.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-xs text-neutral-500">Sort</p>
            <OptionMenu label="Sort" value={sort} options={SORTS} onChange={(value) => setParam("sort", value, "found")} widthClass="w-60" />
          </div>
          <div>
            <p className="mb-1 text-xs text-neutral-500">Filter</p>
            <OptionMenu
              label="Filter"
              value={status}
              options={FILTERS}
              onChange={(value) => setParam("status", value, "all")}
              widthClass="w-[11rem]"
            />
          </div>
          <p className="pb-2 text-sm text-neutral-400">
            Showing {rows.length} of {DEMO_CLAIMS.length}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-neutral-300">No sample claims match this filter.</p>
            <button
              type="button"
              onClick={() => setParam("status", "all", "all")}
              className="mt-4 inline-flex h-11 items-center rounded-lg border border-white/15 px-4 text-sm text-white"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/40">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className="flex w-full flex-col gap-2 px-4 py-4 text-left hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-white">{row.patientName}</span>
                    <span className="mt-1 block text-sm text-neutral-400">
                      {row.dateOfService} · {row.billedCPT} · {row.payerName} · {row.billedAmount}
                    </span>
                    <span className="mt-1 block font-mono text-xs text-red-300">{row.denialCode}</span>
                  </span>
                  <Badge
                    className={
                      row.status === "completed"
                        ? "w-fit bg-emerald-500/10 text-emerald-300"
                        : "w-fit bg-amber-500/10 text-amber-200"
                    }
                  >
                    {row.status === "completed" ? "Letter ready" : "Needs notes"}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-neutral-900 text-white sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>Fictional sample letter</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  {selected.patientName} is not a real patient. {selected.payerName}. Denial {selected.denialCode}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <div>
                  <span className="block text-xs text-neutral-500">Account</span>
                  {selected.patientAccount}
                </div>
                <div>
                  <span className="block text-xs text-neutral-500">Amount</span>
                  {selected.billedAmount}
                </div>
                <div className="col-span-2">
                  <span className="block text-xs text-neutral-500">Reason</span>
                  {selected.denialReason}
                </div>
              </div>
              <div>
                <Label className="mb-2 text-neutral-300">Sample notes</Label>
                <p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-neutral-300">
                  {selected.clinicalNotes}
                </p>
              </div>
              <div>
                <Label htmlFor="demo-letter" className="mb-2 text-neutral-300">
                  Letter draft
                </Label>
                <Textarea
                  id="demo-letter"
                  value={letter}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [selected.id]: event.target.value }))
                  }
                  className="min-h-48 border-white/10 bg-black/30 text-sm text-neutral-100"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button type="button" onClick={copyLetter} className="h-11 bg-indigo-600 text-white hover:bg-indigo-500">
                  Copy letter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadLetter(selected)}
                  className="h-11 border-white/15 bg-transparent text-white hover:bg-white/10"
                >
                  Download
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetOpen(true)}
                  className="h-11 border-white/15 bg-transparent text-white hover:bg-white/10"
                >
                  Reset letter
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={resetOpen}
        title="Reset this sample letter?"
        body="Your edits on this fictional letter are discarded. The other samples stay as they are."
        confirmLabel="Reset letter"
        pendingLabel="Resetting…"
        pending={false}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          if (selected) {
            setDrafts((current) => {
              const next = { ...current };
              delete next[selected.id];
              return next;
            });
          }
          setResetOpen(false);
          toast.success("Sample letter restored.");
        }}
      />
    </PublicShell>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-neutral-950" />}>
      <DemoScreen />
    </Suspense>
  );
}
