"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useExtractionStore, type DenialRow } from "@/stores/extraction-store";
import { createClient } from "@/lib/supabase/client";

type ClaimStatus = "needs_notes" | "completed";

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

export default function ReclaimDashboard() {
  // ── Store (survives navigation) ──
  const rows = useExtractionStore((s) => s.rows);
  const setRows = useExtractionStore((s) => s.setRows);
  const isExtracting = useExtractionStore((s) => s.isExtracting);
  const extractionProgress = useExtractionStore((s) => s.extractionProgress);
  const queuedFiles = useExtractionStore((s) => s.queuedFiles);
  const progressPercent = useExtractionStore((s) => s.progressPercent);
  const progressPagesProcessed = useExtractionStore((s) => s.progressPagesProcessed);
  const progressTotalPages = useExtractionStore((s) => s.progressTotalPages);
  const addFilesToQueue = useExtractionStore((s) => s.addFilesToQueue);
  const removeFromQueue = useExtractionStore((s) => s.removeFromQueue);
  const clearQueue = useExtractionStore((s) => s.clearQueue);
  const processQueue = useExtractionStore((s) => s.processQueue);
  const moveToTrash = useExtractionStore((s) => s.moveToTrash);
  const loadFromStorage = useExtractionStore((s) => s.loadFromStorage);

  // ── UI-only local state (reset on navigate — that's fine) ──
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const router = useRouter();
  const trialActiveRef = useRef<boolean | null>(null); // null = not yet checked

  // Load worklist from localStorage once
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  // Check trial status on mount
  useEffect(() => {
    const checkTrial = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("trial_ends_at, subscription_status")
          .eq("id", user.id)
          .single();
        if (profile) {
          const isActive = profile.subscription_status === "active" || new Date() <= new Date(profile.trial_ends_at);
          trialActiveRef.current = isActive;
        }
      } catch { /* fail open — let the API catch it */ }
    };
    checkTrial();
  }, []);

  // Guard: redirect to billing if trial expired
  const guardTrial = (): boolean => {
    if (trialActiveRef.current === false) {
      toast.error("Your 14-day free trial has expired. Please upgrade to continue.");
      router.push("/dashboard/billing");
      return false;
    }
    return true;
  };

  const selectedRow = rows.find(r => r.id === selectedRowId);

  // ── Drag & Drop ──
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFilesToQueue(e.dataTransfer.files);
  }, [addFilesToQueue]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFilesToQueue(e.target.files);
    e.target.value = "";
  };

  // ── Modal Controls ──
  const openModal = (row: DenialRow) => { setSelectedRowId(row.id); setClinicalNotes(row.clinicalNotes || ""); };
  const closeModal = () => { setSelectedRowId(null); setClinicalNotes(""); };
  const selectedIndex = rows.findIndex(r => r.id === selectedRowId);
  const hasNext = selectedIndex !== -1 && selectedIndex < rows.length - 1;
  const hasPrev = selectedIndex > 0;
  const handleNext = () => { if (hasNext) openModal(rows[selectedIndex + 1]); };
  const handlePrev = () => { if (hasPrev) openModal(rows[selectedIndex - 1]); };

  // ── Generate Appeal ──
  const handleGenerate = async () => {
    if (!selectedRow) return;
    if (!guardTrial()) return;
    if (!clinicalNotes.trim()) { toast.warning("Please paste clinical notes before generating."); return; }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/appeals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insuranceCompany: selectedRow.payerName,
          dateOfService: selectedRow.dateOfService,
          billedCode: selectedRow.billedCPT,
          denialReason: `${selectedRow.denialCode} — ${selectedRow.denialReason}`,
          clinicalNotes,
          patientAccount: selectedRow.patientAccount,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.message || data.error || "Failed to generate appeal.");

      setRows(prev => prev.map(r => r.id === selectedRow.id ? { ...r, status: "completed" as ClaimStatus, clinicalNotes, generatedLetter: data.letter } : r));
      toast.success("Appeal letter generated & saved!");
    } catch (err: any) { toast.error(err.message || "An error occurred."); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-2">EOB Denial Triage</h1>
        <p className="text-neutral-400">Upload an Explanation of Benefits PDF. We extract only the denied claims.</p>
      </div>

      {/* ── Unified Dropzone + Queue ── */}
      <div
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        className={`w-full mb-8 rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out backdrop-blur-sm ${
          isDragging ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]" :
          isExtracting ? "border-amber-500/50 bg-amber-500/5 pointer-events-none" :
          "border-white/10 bg-white/5 hover:border-white/20"
        }`}
      >
        {isExtracting ? (
          /* ── Progress Bar State ── */
          <div className="p-10 flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-300 font-semibold text-lg">{progressPercent}%</span>
                <span className="text-neutral-500 font-mono">
                  {progressPagesProcessed} / {progressTotalPages || "?"} pages
                </span>
              </div>
              <div className="relative w-full h-3 rounded-full bg-neutral-800/80 overflow-hidden border border-white/5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                  style={{ width: `${Math.max(progressPercent, 2)}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse rounded-full" />
              </div>
              <p className="text-neutral-400 text-sm text-center leading-relaxed">{extractionProgress}</p>
              {rows.length > 0 && (
                <p className="text-emerald-400/80 text-xs text-center font-medium">
                  {rows.length} denial{rows.length !== 1 ? "s" : ""} found so far...
                </p>
              )}
            </div>
          </div>
        ) : queuedFiles.length === 0 ? (
          /* ── Empty State: Drop/Browse prompt ── */
          <div
            className="flex flex-col items-center justify-center p-12 text-center cursor-pointer"
            onClick={() => document.getElementById("pdf-upload")?.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={`mb-4 transition-colors ${isDragging ? "text-indigo-400" : "text-neutral-500"}`}>
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/>
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">Drop EOB PDFs here or click to browse</h3>
            <p className="text-neutral-400 max-w-lg">Add one or many PDFs. When ready, click &quot;Extract Denials&quot; to process them all.</p>
          </div>
        ) : (
          /* ── Files Queued: Show queue + extract button inside the box ── */
          <div className="p-5 space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-300">
                {queuedFiles.length} PDF{queuedFiles.length > 1 ? "s" : ""} queued
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); document.getElementById("pdf-upload")?.click(); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add More
                </button>
                <button onClick={(e) => { e.stopPropagation(); clearQueue(); }} className="text-xs text-neutral-500 hover:text-red-400 transition-colors">Clear All</button>
              </div>
            </div>

            {/* File chips — click to preview */}
            <div className="flex flex-wrap gap-2">
              {queuedFiles.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="group flex items-center gap-2 bg-neutral-800/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-neutral-300 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = URL.createObjectURL(file);
                    setPreviewUrl(url);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 shrink-0"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-neutral-600 font-mono">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                  {/* Eye icon for preview hint */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600 group-hover:text-indigo-400 transition-colors shrink-0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {/* Remove button */}
                  <button
                    onClick={(ev) => { ev.stopPropagation(); removeFromQueue(i); }}
                    className="text-neutral-600 hover:text-red-400 transition-colors ml-0.5 shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Extract Button */}
            <Button onClick={(e: React.MouseEvent) => { e.stopPropagation(); if (!guardTrial()) return; processQueue(); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 text-base font-semibold shadow-[0_0_25px_rgba(99,102,241,0.3)] hover:shadow-[0_0_35px_rgba(99,102,241,0.5)] transition-all rounded-xl border border-indigo-500/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Extract Denials from {queuedFiles.length} PDF{queuedFiles.length > 1 ? "s" : ""}
            </Button>
          </div>
        )}
        <input id="pdf-upload" type="file" accept=".pdf" multiple className="hidden" onChange={handleFileInput} />
      </div>

      {/* ── PDF Preview Modal (portaled to body to escape sidebar stacking context) ── */}
      {previewUrl && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
          <div className="relative w-[95vw] h-[92vh] max-w-5xl bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-neutral-950/60 shrink-0">
              <h3 className="text-sm font-semibold text-neutral-300">PDF Preview</h3>
              <button
                onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                className="p-1.5 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {/* PDF iframe viewer */}
            <iframe src={previewUrl} className="flex-1 w-full bg-white" title="PDF Preview" />
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Action Bar — only visible in selection mode */}
      {isSelectionMode && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-neutral-900/60 backdrop-blur-sm px-5 py-3 animate-in slide-in-from-top-2 duration-200">
          <span className="text-sm text-neutral-300 font-medium">
            {selectedIds.size > 0
              ? <>{selectedIds.size} claim{selectedIds.size !== 1 ? "s" : ""} selected</>
              : "Select claims to delete"
            }
          </span>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-neutral-400 hover:text-white transition-colors">
                Deselect All
              </button>
            )}
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.size} selected claim(s)?`)) {
                    const toTrash = rows.filter(r => selectedIds.has(r.id));
                    moveToTrash(toTrash);
                    setRows(prev => prev.filter(r => !selectedIds.has(r.id)));
                    toast.success(`Moved ${selectedIds.size} claim(s) to Recycle Bin.`);
                    setSelectedIds(new Set());
                    setIsSelectionMode(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-500 text-white border-red-500/50 text-xs h-8 px-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Delete Selected
              </Button>
            )}
            <button
              onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
              className="text-xs text-neutral-400 hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Triage Table */}
      <Card className="shadow-lg border-white/10 bg-neutral-900/40 backdrop-blur-2xl text-white relative overflow-hidden gap-0 p-0">
        <CardHeader className="border-b border-white/10 p-4 flex flex-row items-center justify-between bg-[#141414]">
          <div>
            <CardTitle className="text-xl tracking-tight">Denied Claims ({rows.length})</CardTitle>
            <CardDescription className="text-neutral-400">Click any row to paste clinical notes and generate an appeal.</CardDescription>
          </div>
          {rows.length > 0 && !isSelectionMode && (
            <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)}
              className="bg-transparent border-white/20 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors">
              Manage
            </Button>
          )}
        </CardHeader>
        {/* This div is the scroll container — thead sticks inside it */}
        <div className="overflow-y-auto overflow-x-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader className="bg-[#0f172a] sticky top-0 z-10">
              <TableRow className="border-white/5 hover:bg-transparent">
                {isSelectionMode && (
                  <TableHead className="text-neutral-400 font-semibold h-11 w-10 bg-[#0f172a]">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={rows.length > 0 && selectedIds.size === rows.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(rows.map(r => r.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                )}
                <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">Patient</TableHead>
                <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">DOS</TableHead>
                <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">Code</TableHead>
                <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">Denial</TableHead>
                <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">Payer</TableHead>
                <TableHead className="text-neutral-400 font-semibold h-11 bg-[#0f172a]">Found</TableHead>
                <TableHead className="text-neutral-400 font-semibold h-11 text-right pr-6 bg-[#0f172a]">Status</TableHead>
                {isSelectionMode && <TableHead className="text-neutral-400 font-semibold h-11 w-10 bg-[#0f172a]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={isSelectionMode ? 9 : 7} className="text-center py-16 text-neutral-500">No claims loaded. Upload an EOB PDF to begin.</TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`border-white/5 border-b hover:bg-white/5 cursor-pointer transition-colors ${selectedIds.has(row.id) ? "bg-indigo-500/5" : ""}`}
                    onClick={() => openModal(row)}
                  >
                    {isSelectionMode && (
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={selectedIds.has(row.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(row.id);
                            else next.delete(row.id);
                            setSelectedIds(next);
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-neutral-200">
                      <div>{row.patientName !== "Unknown" ? row.patientName : row.patientAccount}</div>
                      {row.patientName !== "Unknown" && row.patientAccount !== "Unknown" && row.patientAccount !== row.patientName && (
                        <div className="text-xs text-neutral-500">{row.patientAccount}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-neutral-300">{row.dateOfService}</TableCell>
                    <TableCell className="text-neutral-300"><span className="bg-neutral-800 px-2 py-1 rounded text-xs font-mono border border-white/5">{row.billedCPT}</span></TableCell>
                    <TableCell className="text-neutral-300 max-w-[200px]">
                      <span className="text-red-400 font-mono text-xs">{row.denialCode}</span>
                      {row.denialReason !== "Unknown" && <div className="text-xs text-neutral-500 truncate" title={row.denialReason}>{row.denialReason}</div>}
                    </TableCell>
                    <TableCell className="text-neutral-300">{row.payerName}</TableCell>
                    <TableCell className="text-neutral-500 text-xs font-mono whitespace-nowrap">
                      {row.createdAt ? timeAgo(row.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {row.status === "completed"
                        ? <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 px-3 py-1">Completed</Badge>
                        : <Badge className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20 px-3 py-1">Needs Notes</Badge>
                      }
                    </TableCell>
                    {isSelectionMode && (
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            moveToTrash([row]);
                            setRows(prev => prev.filter(r => r.id !== row.id));
                            setSelectedIds(prev => { const next = new Set(prev); next.delete(row.id); return next; });
                            toast.success("Moved to Recycle Bin.");
                          }}
                          className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete this claim"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Appeal Generation Modal */}
      <Dialog open={!!selectedRowId} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-xl bg-neutral-900/60 backdrop-blur-3xl border border-white/10 text-white shadow-2xl max-h-[90dvh] overflow-y-auto pt-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight mb-2">{selectedRow?.status === "completed" ? "Review Appeal" : "Generate Appeal"}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              {selectedRow?.status === "completed" ? "This letter has already been generated." : "Paste the doctor's EMR clinical notes below to instantly generate a legally persuasive appeal."}
            </DialogDescription>
          </DialogHeader>

          {selectedRow && (
            <div className="space-y-6 my-4">
              {/* Claim Summary */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                  <div className="flex items-center gap-2"><span className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Patient</span><span className="font-medium text-neutral-200">{selectedRow.patientAccount}</span></div>
                  <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
                  <div className="flex items-center gap-2"><span className="text-xs text-neutral-500 uppercase tracking-widest font-bold">DOS</span><span className="font-medium text-neutral-200">{selectedRow.dateOfService}</span></div>
                  <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
                  <div className="flex items-center gap-2"><span className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Code</span><span className="bg-neutral-800 px-2 py-0.5 rounded text-sm font-mono border border-white/5 text-neutral-200">{selectedRow.billedCPT}</span></div>
                  <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
                  <div className="flex items-center gap-2"><span className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Payer</span><span className="font-medium text-neutral-200">{selectedRow.payerName}</span></div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-sm flex items-start gap-3 border border-white/10">
                  <div><span className="font-bold text-white block mb-0.5">Denial: <span className="text-red-400 font-mono">{selectedRow.denialCode}</span></span><span className="text-neutral-300 leading-relaxed">{selectedRow.denialReason}</span></div>
                </div>
              </div>

              {selectedRow.status === "needs_notes" ? (
                <div className="space-y-4">
                  <div className="mb-2">
                    <Label className="text-indigo-300 font-semibold flex items-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                      Paste EMR Clinical Notes
                    </Label>
                    <p className="text-xs text-neutral-400 leading-relaxed">Copy the doctor's raw clinical notes from your EMR for this date of service.</p>
                  </div>
                  <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all overflow-hidden flex flex-col">
                    <Textarea id="clinicalNotes" autoFocus placeholder="Paste raw notes here (Ctrl+V)..." className="min-h-[220px] bg-transparent border-0 text-white placeholder:text-neutral-600 focus-visible:ring-0 resize-y text-base p-4 custom-scrollbar" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} />
                    <div className="bg-black/20 p-3 border-t border-white/5 flex items-center justify-end shrink-0">
                      <Button type="button" onClick={handleGenerate} disabled={isGenerating || !clinicalNotes.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all duration-300 ease-in-out rounded-lg h-10 px-8 font-medium text-sm border border-indigo-500/50">
                        {isGenerating ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Analyzing...</span> : "Generate Appeal"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-emerald-400 font-semibold flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                      Generated Letter
                    </Label>
                    <Button variant="ghost" size="sm" onClick={() => { setRows(prev => prev.map(r => r.id === selectedRow.id ? { ...r, status: "needs_notes" as ClaimStatus } : r)); setClinicalNotes(selectedRow.clinicalNotes || ""); }}
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-xs h-8 px-2 transition-colors border border-transparent hover:border-amber-400/20">
                      Start Over
                    </Button>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 max-h-[300px] overflow-y-auto text-sm text-neutral-300 whitespace-pre-wrap custom-scrollbar">{selectedRow.generatedLetter}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <div className="flex flex-col gap-2 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                      <Button type="button" onClick={() => { navigator.clipboard.writeText(selectedRow.generatedLetter || ""); toast.success("Copied!"); }} className="bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-all w-full">Copy Text</Button>
                      <p className="text-xs text-neutral-500 text-center">For pasting into payer portals or EMR.</p>
                    </div>
                    <div className="flex flex-col gap-2 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                      <Button type="button" onClick={() => {
                        const el = document.createElement("a"); const blob = new Blob([selectedRow.generatedLetter || ""], { type: "text/plain" }); el.href = URL.createObjectURL(blob);
                        el.download = `Appeal_${selectedRow.payerName}_${selectedRow.dateOfService.replace(/\//g, "-")}.txt`; document.body.appendChild(el); el.click(); document.body.removeChild(el); toast.success("Downloaded!");
                      }} className="bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-all w-full">Download (.txt)</Button>
                      <p className="text-xs text-neutral-500 text-center">For printing, faxing, or mailing.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="sm:justify-between items-center w-full mt-2 border-t border-white/5 pt-4 bg-transparent">
            <div className="flex gap-2 w-full sm:w-auto mb-2 sm:mb-0">
              <Button type="button" variant="outline" onClick={handlePrev} disabled={!hasPrev} className="bg-transparent border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-30 flex-1 sm:flex-none">Previous</Button>
              <Button type="button" variant="outline" onClick={handleNext} disabled={!hasNext} className="bg-transparent border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-30 flex-1 sm:flex-none">Next</Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Link href="/dashboard/history" passHref><Button type="button" variant="outline" className="bg-transparent border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 w-full sm:w-auto">Saved Letters</Button></Link>
              <Button type="button" variant="outline" onClick={closeModal} className="bg-transparent border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 w-full sm:w-auto">Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
