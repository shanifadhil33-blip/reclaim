"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DEMO_CLAIMS } from "@/lib/demo-data";
import type { DenialRow } from "@/stores/extraction-store";

function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function LiveDemoPage() {
  const [rows] = useState<DenialRow[]>(DEMO_CLAIMS);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showSampleLetter, setShowSampleLetter] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const selectedRow = rows.find((r) => r.id === selectedRowId) ?? null;
  const selectedIndex = rows.findIndex((r) => r.id === selectedRowId);
  const hasNext = selectedIndex !== -1 && selectedIndex < rows.length - 1;
  const hasPrev = selectedIndex > 0;

  const blockUpload = () => {
    toast.message("Sign in to process custom EOB files", {
      description: "Demo Mode shows sample denials only. Create a free account to upload your own EOBs.",
      action: {
        label: "Sign in",
        onClick: () => {
          window.location.href = "/login?mode=signup";
        },
      },
    });
  };

  const openModal = (row: DenialRow) => {
    setSelectedRowId(row.id);
    setShowSampleLetter(row.status === "completed");
  };

  const closeModal = () => {
    setSelectedRowId(null);
    setShowSampleLetter(false);
  };

  const handleNext = () => {
    if (!hasNext) return;
    openModal(rows[selectedIndex + 1]!);
  };

  const handlePrev = () => {
    if (!hasPrev) return;
    openModal(rows[selectedIndex - 1]!);
  };

  const copyLetter = () => {
    if (!selectedRow?.generatedLetter) return;
    void navigator.clipboard.writeText(selectedRow.generatedLetter);
    toast.success("Copied sample letter!");
  };

  const downloadLetter = () => {
    if (!selectedRow?.generatedLetter) return;
    const el = document.createElement("a");
    const blob = new Blob([selectedRow.generatedLetter], { type: "text/plain" });
    el.href = URL.createObjectURL(blob);
    el.download = `Demo_Appeal_${selectedRow.payerName}_${selectedRow.dateOfService.replace(/\//g, "-")}.txt`;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    toast.success("Downloaded sample letter!");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-indigo-500/30">
      {/* Demo banner */}
      <div className="sticky top-0 z-50 border-b border-amber-500/20 bg-amber-500/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <p className="text-sm font-medium text-amber-200/90">
            ⚡ Demo Mode — Viewing sample EOB data
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="hidden sm:inline text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Back to home
            </Link>
            <Link
              href="/login?mode=signup"
              className={buttonVariants({
                size: "sm",
                className:
                  "h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground text-xs font-semibold px-4",
              })}
            >
              Sign up free
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-200 pb-16">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-2">
            EOB Denial Triage
          </h1>
          <p className="text-neutral-400">
            Explore sample denials — click any row to review clinical notes and a pre-written appeal.
          </p>
        </div>

        {/* Disabled dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            blockUpload();
          }}
          onClick={blockUpload}
          className={`relative z-10 w-full mb-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer backdrop-blur-sm ${
            isDragging
              ? "border-amber-500 bg-amber-500/10"
              : "border-white/10 bg-white/5 hover:border-white/20"
          }`}
        >
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4 text-neutral-500"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M12 18v-6" />
              <path d="m9 15 3-3 3 3" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop EOB PDFs here or click to browse
            </h3>
            <p className="text-neutral-400 max-w-lg">
              Upload is disabled in Demo Mode. Sign in to process your own files.
            </p>
          </div>
        </div>

        {/* Triage table */}
        <Card className="relative z-10 shadow-lg border-white/10 bg-neutral-900/40 backdrop-blur-2xl text-white overflow-hidden gap-0 p-0">
          <CardHeader className="border-b border-white/10 p-4 flex flex-row items-center justify-between bg-[#141414]">
            <div>
              <CardTitle className="text-xl tracking-tight">
                Denied Claims ({rows.length})
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Click any row to view clinical notes and sample appeal letters.
              </CardDescription>
            </div>
            <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/10">
              Sample data
            </Badge>
          </CardHeader>
          <div className="overflow-y-auto overflow-x-auto max-h-[calc(100vh-280px)]">
            <Table>
              <TableHeader className="bg-[#0f172a] sticky top-0 z-10">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">Patient</TableHead>
                  <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">DOS</TableHead>
                  <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">Code</TableHead>
                  <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">Denial</TableHead>
                  <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">Payer</TableHead>
                  <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">Found</TableHead>
                  <TableHead className="text-neutral-400 font-semibold h-11 text-right pr-6 bg-[#0f172a]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-white/5 border-b hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => openModal(row)}
                  >
                    <TableCell className="font-medium text-neutral-200">
                      <div>{row.patientName}</div>
                      <div className="text-xs text-neutral-500">{row.patientAccount}</div>
                    </TableCell>
                    <TableCell className="text-neutral-300">{row.dateOfService}</TableCell>
                    <TableCell className="text-neutral-300">
                      <span className="bg-neutral-800 px-2 py-1 rounded text-xs font-mono border border-white/5">
                        {row.billedCPT}
                      </span>
                    </TableCell>
                    <TableCell className="text-neutral-300 max-w-[200px]">
                      <span className="text-red-400 font-mono text-xs">{row.denialCode}</span>
                      <div className="text-xs text-neutral-500 truncate" title={row.denialReason}>
                        {row.denialReason}
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-300">{row.payerName}</TableCell>
                    <TableCell className="text-neutral-500 text-xs font-mono whitespace-nowrap">
                      {timeAgo(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {row.status === "completed" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 px-3 py-1">
                          Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20 px-3 py-1">
                          Needs Notes
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Detail modal */}
        <Dialog open={!!selectedRowId} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="sm:max-w-xl bg-neutral-900/60 backdrop-blur-3xl border border-white/10 text-white shadow-2xl max-h-[90dvh] overflow-y-auto pt-10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight mb-2">
                {showSampleLetter ? "Sample Appeal Letter" : "Clinical Notes"}
              </DialogTitle>
              <DialogDescription className="text-neutral-400">
                Demo Mode — sample content only. Sign in to generate appeals from your EOBs.
              </DialogDescription>
            </DialogHeader>

            {selectedRow && (
              <div className="space-y-6 my-4">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-neutral-500 block mb-0.5">Patient</span>
                    <span className="text-neutral-200">{selectedRow.patientName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 block mb-0.5">Account</span>
                    <span className="text-neutral-200 font-mono">{selectedRow.patientAccount}</span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 block mb-0.5">DOS</span>
                    <span className="text-neutral-200">{selectedRow.dateOfService}</span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 block mb-0.5">CPT</span>
                    <span className="text-neutral-200 font-mono">{selectedRow.billedCPT}</span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 block mb-0.5">Denial</span>
                    <span className="text-red-400 font-mono">{selectedRow.denialCode}</span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 block mb-0.5">Payer</span>
                    <span className="text-neutral-200">{selectedRow.payerName}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-xs text-neutral-500 block mb-0.5">Reason</span>
                    <span className="text-neutral-300">{selectedRow.denialReason}</span>
                  </div>
                </div>

                {!showSampleLetter ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-indigo-300 font-semibold flex items-center gap-2 mb-2">
                        Pre-loaded EMR Clinical Notes
                      </Label>
                      <Textarea
                        readOnly
                        value={selectedRow.clinicalNotes}
                        className="min-h-[160px] bg-white/5 border-white/10 text-neutral-300 text-sm resize-y"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowSampleLetter(true)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-11 rounded-lg border border-indigo-500/50"
                    >
                      Preview Sample Appeal Letter
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-emerald-400 font-semibold">Generated Letter</Label>
                      {selectedRow.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSampleLetter(false)}
                          className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-xs h-8"
                        >
                          Back to notes
                        </Button>
                      )}
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 max-h-[300px] overflow-y-auto text-sm text-neutral-300 whitespace-pre-wrap">
                      {selectedRow.generatedLetter}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <Button
                        type="button"
                        onClick={copyLetter}
                        className="bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground border border-border w-full"
                      >
                        Copy Text
                      </Button>
                      <Button
                        type="button"
                        onClick={downloadLetter}
                        className="bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground border border-border w-full"
                      >
                        Download (.txt)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="sm:justify-between items-center w-full mt-2 border-t border-white/5 pt-4">
              <div className="flex gap-2 w-full sm:w-auto mb-2 sm:mb-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-35 disabled:text-muted-foreground/70 flex-1 sm:flex-none"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-35 disabled:text-muted-foreground/70 flex-1 sm:flex-none"
                >
                  Next
                </Button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Link href="/login?mode=signup" className="w-full sm:w-auto">
                  <Button
                    type="button"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground w-full sm:w-auto"
                  >
                    Sign up to use real EOBs
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-accent w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
