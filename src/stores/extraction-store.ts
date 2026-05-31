/**
 * Zustand store for the EOB extraction pipeline.
 * Lives outside React component lifecycle so navigating away from the dashboard
 * (e.g. to Settings) does NOT cancel an in-progress extraction.
 */
import { create } from "zustand";
import { toast } from "sonner";

type ClaimStatus = "needs_notes" | "completed";

export interface DenialRow {
  id: string;
  patientAccount: string;
  patientName: string;
  dateOfService: string;
  billedCPT: string;
  denialCode: string;
  denialReason: string;
  billedAmount: string;
  paidAmount: string;
  payerName: string;
  status: ClaimStatus;
  clinicalNotes: string;
  generatedLetter: string | null;
  createdAt: string;
}

interface ExtractionState {
  // ── Data ──
  rows: DenialRow[];
  isLoaded: boolean;

  // ── Queue ──
  queuedFiles: File[];

  // ── Pipeline status ──
  isExtracting: boolean;
  extractionProgress: string;
  extractionPhase: string;
  progressPercent: number;
  progressPagesProcessed: number;
  progressTotalPages: number;

  // ── Trial ──
  trialExpired: boolean;

  // ── Actions ──
  loadFromStorage: () => void;
  setRows: (updater: DenialRow[] | ((prev: DenialRow[]) => DenialRow[])) => void;
  addFilesToQueue: (files: FileList | File[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  processQueue: () => Promise<void>;
  moveToTrash: (claims: DenialRow[]) => void;
  dismissTrialExpired: () => void;
}

const CHUNK_SIZE = 3; // pages per API call — kept small for Vercel's 4.5MB body limit

/** Convert a raw claim from the API into a DenialRow */
function claimToRow(c: any, index: number): DenialRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
    patientAccount: c.patientAccount || "Unknown",
    patientName: c.patientName || "Unknown",
    dateOfService: c.dateOfService || "Unknown",
    billedCPT: c.billedCPT || "Unknown",
    denialCode: c.denialCode || "Unknown",
    denialReason: c.denialReason || "Unknown",
    billedAmount: c.billedAmount || "$0.00",
    paidAmount: c.paidAmount || "$0.00",
    payerName: c.payerName || "Unknown",
    status: "needs_notes",
    clinicalNotes: "",
    generatedLetter: null,
    createdAt: new Date().toISOString(),
  };
}

/** Persist rows to localStorage */
function saveRows(rows: DenialRow[]) {
  try {
    localStorage.setItem("reclaim_eob_worklist", JSON.stringify(rows));
  } catch { /* quota exceeded — ignore */ }
}

/** Send a chunk (images or text) to the API and return claims + validation metadata */
async function sendChunkToAPI(
  payload: { images?: string[]; text?: string },
  chunkLabel: string
): Promise<{ rows: DenialRow[]; validationAttempts: number }> {
  console.log(`[CHUNK] Sending ${chunkLabel}...`);
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 413) {
    throw new Error("Payload too large. Reduce pages per batch.");
  }

  const data = await res.json();
  console.log(`[CHUNK] ${chunkLabel} response:`, JSON.stringify(data, null, 2));

  if (!res.ok) {
    // 402 = trial expired — must abort entire pipeline, not just this chunk
    if (res.status === 402 || data.code === "PAYMENT_REQUIRED") {
      const err = new Error(data.error || "Your 14-day free trial has expired.");
      (err as any).code = "PAYMENT_REQUIRED";
      throw err;
    }
    throw new Error(data.error || `Server error (${res.status})`);
  }

  if (data.warnings?.length) {
    console.warn(`[CHUNK] ${chunkLabel} warnings:`, data.warnings);
  }

  const validationAttempts = data.validationAttempts || 1;

  if (!data.claims || data.claims.length === 0) return { rows: [], validationAttempts };
  return {
    rows: data.claims.map((c: any, i: number) => claimToRow(c, i)),
    validationAttempts,
  };
}

export const useExtractionStore = create<ExtractionState>((set, get) => ({
  // ── Initial state ──
  rows: [],
  isLoaded: false,
  queuedFiles: [],
  isExtracting: false,
  extractionProgress: "",
  extractionPhase: "",
  progressPercent: 0,
  progressPagesProcessed: 0,
  progressTotalPages: 0,
  trialExpired: false,

  // ── Actions ──
  loadFromStorage: () => {
    if (get().isLoaded) return; // only run once
    const saved = localStorage.getItem("reclaim_eob_worklist");
    if (saved) {
      try {
        set({ rows: JSON.parse(saved) });
      } catch {
        console.error("Failed to parse saved worklist");
      }
    }
    set({ isLoaded: true });
  },

  setRows: (updater) => {
    const current = get().rows;
    const next = typeof updater === "function" ? updater(current) : updater;
    set({ rows: next });
    saveRows(next);
  },

  addFilesToQueue: (files) => {
    const pdfs = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    if (pdfs.length === 0) {
      toast.error("Please select valid PDF files.");
      return;
    }
    set((s) => ({ queuedFiles: [...s.queuedFiles, ...pdfs] }));
    toast.success(`${pdfs.length} PDF(s) added to queue.`);
  },

  removeFromQueue: (index) => {
    set((s) => ({ queuedFiles: s.queuedFiles.filter((_, i) => i !== index) }));
  },

  clearQueue: () => set({ queuedFiles: [] }),

  dismissTrialExpired: () => set({ trialExpired: false }),

  moveToTrash: (claimsToTrash) => {
    const existing = JSON.parse(localStorage.getItem("reclaim_eob_trash") || "[]");
    const trashedItems = claimsToTrash.map((c) => ({
      ...c,
      deletedAt: new Date().toISOString(),
    }));
    localStorage.setItem(
      "reclaim_eob_trash",
      JSON.stringify([...trashedItems, ...existing])
    );
  },

  // ── Main pipeline ──
  processQueue: async () => {
    const { queuedFiles } = get();
    if (queuedFiles.length === 0) {
      toast.warning("No PDFs queued. Drop or select files first.");
      return;
    }

    // Guard: don't run two extractions at once
    if (get().isExtracting) {
      toast.warning("Extraction already in progress.");
      return;
    }

    toast.warning("Extraction started! Please keep this tab active and visible to prevent the browser from throttling execution.", {
      duration: 6000,
    });

    set({
      isExtracting: true,
      extractionProgress: "Loading PDF engine...",
      extractionPhase: "Preparing...",
      progressPercent: 0,
      progressPagesProcessed: 0,
      progressTotalPages: 0,
    });

    let totalDenialsFound = 0;

    try {
      const pdfjsLib = await import("pdfjs-dist");
      
      // Resilient worker loading: try multiple CDNs with fallback
      const version = pdfjsLib.version;
      const workerCDNs = [
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`,
        `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`,
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`,
      ];

      let workerLoaded = false;
      for (const cdnUrl of workerCDNs) {
        try {
          // Verify the CDN URL is reachable before using it
          const probe = await fetch(cdnUrl, { method: "HEAD" });
          if (probe.ok) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = cdnUrl;
            workerLoaded = true;
            console.log(`[PDF] Worker loaded from: ${cdnUrl}`);
            break;
          }
        } catch {
          console.warn(`[PDF] CDN unreachable: ${cdnUrl}`);
        }
      }

      if (!workerLoaded) {
        // Last resort: use inline worker (no CDN needed, slightly slower but always works)
        console.warn("[PDF] All CDNs failed — using inline worker fallback");
        const workerBlob = new Blob(
          [`importScripts("https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs")`],
          { type: "application/javascript" }
        );
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
      }

      // First pass: count total pages across all files
      const pdfDocs: { pdf: any; file: File }[] = [];
      let grandTotalPages = 0;
      for (const file of queuedFiles) {
        set({ extractionProgress: `Loading ${file.name}...` });
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfDocs.push({ pdf, file });
        grandTotalPages += pdf.numPages;
      }
      set({ progressTotalPages: grandTotalPages });
      console.log(
        `[PIPELINE] ${queuedFiles.length} file(s), ${grandTotalPages} total pages, chunk size: ${CHUNK_SIZE}`
      );

      // Create a single reusable canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const RENDER_WEIGHT = 0.3;
      const API_WEIGHT = 0.7;
      let completedWeight = 0;
      let pagesFullyProcessed = 0;

      const updateProgress = (pagesCompleted: number) => {
        const pct = Math.round((completedWeight / grandTotalPages) * 100);
        set({
          progressPercent: Math.min(pct, 99),
          progressPagesProcessed: pagesCompleted,
        });
      };

      // ── Render helper (inline — needs canvas) ──
      const renderPageRange = async (
        pdf: any,
        startPage: number,
        endPage: number,
        fileName: string,
        onPageRendered?: (pageNum: number) => void
      ): Promise<{ images: string[]; isNarrow: boolean }> => {
        const images: string[] = [];
        let isNarrow = false;

        for (let i = startPage; i <= endPage; i++) {
          set({
            extractionProgress: `Rendering ${fileName} — page ${i} of ${pdf.numPages}...`,
          });
          const page = await pdf.getPage(i);
          const naturalViewport = page.getViewport({ scale: 1.0 });
          const scale = Math.max(2.5, 1200 / naturalViewport.width);
          const viewport = page.getViewport({ scale });

          if (naturalViewport.width < 200) {
            isNarrow = true;
            console.warn(
              `[PDF] Page ${i}: only ${Math.round(naturalViewport.width)}pt wide — text fallback`
            );
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          console.log(
            `[PDF] Page ${i}: ${Math.round(dataUrl.length / 1024)}KB (${canvas.width}x${canvas.height}, scale=${scale.toFixed(1)})`
          );
          images.push(dataUrl);
          onPageRendered?.(i);
        }

        return { images, isNarrow };
      };

      // ── Extract text helper ──
      const extractTextRange = async (
        pdf: any,
        startPage: number,
        endPage: number,
        fileName: string
      ): Promise<string> => {
        let text = "";
        for (let i = startPage; i <= endPage; i++) {
          set({ extractionProgress: `Extracting text from ${fileName} — page ${i}...` });
          const page = await pdf.getPage(i);
          const tc = await page.getTextContent();
          text += `\n--- PAGE ${i} ---\n${tc.items.map((item: any) => item.str).join(" ")}`;
        }
        return text;
      };

      // ── Process each file ──
      for (const { pdf, file } of pdfDocs) {
        const numPages = pdf.numPages;

        for (let chunkStart = 1; chunkStart <= numPages; chunkStart += CHUNK_SIZE) {
          const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, numPages);
          const chunkPageCount = chunkEnd - chunkStart + 1;
          const chunkLabel = `${file.name} pages ${chunkStart}-${chunkEnd}`;

          set({
            extractionProgress: `Rendering pages ${chunkStart}–${chunkEnd} of ${numPages}...`,
          });

          // Step 1: Render pages
          const { images, isNarrow } = await renderPageRange(
            pdf,
            chunkStart,
            chunkEnd,
            file.name,
            () => {
              completedWeight += RENDER_WEIGHT;
              updateProgress(pagesFullyProcessed);
            }
          );

          // Step 2: Send to API
          let newRows: DenialRow[] = [];

          if (isNarrow) {
            console.log(`[PIPELINE] ${chunkLabel}: narrow pages, using text mode`);
            const text = await extractTextRange(pdf, chunkStart, chunkEnd, file.name);
            if (text.length > 50) {
              set({
                extractionProgress: `AI analyzing text from pages ${chunkStart}–${chunkEnd}...`,
                extractionPhase: "Extracting data...",
              });
              try {
                const result = await sendChunkToAPI({ text }, `TEXT ${chunkLabel}`);
                newRows = result.rows;
                if (result.validationAttempts > 1) {
                  set({ extractionPhase: `Verified on attempt ${result.validationAttempts} of 3` });
                } else {
                  set({ extractionPhase: "Data verified ✓" });
                }
              } catch (err: any) {
                if ((err as any).code === "PAYMENT_REQUIRED") throw err;
                console.warn(`[PIPELINE] Text failed for ${chunkLabel}: ${err.message}`);
                toast.warning(`Pages ${chunkStart}-${chunkEnd}: ${err.message}`);
              }
            }
          } else {
            set({
              extractionProgress: `AI analyzing pages ${chunkStart}–${chunkEnd}...`,
              extractionPhase: "Extracting data...",
            });
            try {
              // Phase transitions happen during the fetch — the API may retry internally
              set({ extractionPhase: "Extracting data..." });
              const result = await sendChunkToAPI({ images }, `VISION ${chunkLabel}`);
              newRows = result.rows;

              if (result.validationAttempts > 1) {
                set({ extractionPhase: `Verified on attempt ${result.validationAttempts} of 3` });
              } else {
                set({ extractionPhase: "Data verified ✓" });
              }

              if (newRows.length === 0) {
                console.log(
                  `[PIPELINE] Vision returned 0 for ${chunkLabel}, retrying text...`
                );
                set({
                  extractionProgress: `Retrying pages ${chunkStart}–${chunkEnd} with text...`,
                  extractionPhase: "Retrying with text mode...",
                });
                const text = await extractTextRange(pdf, chunkStart, chunkEnd, file.name);
                if (text.length > 50) {
                  const fallbackResult = await sendChunkToAPI({ text }, `TEXT-FALLBACK ${chunkLabel}`);
                  newRows = fallbackResult.rows;
                  if (fallbackResult.validationAttempts > 1) {
                    set({ extractionPhase: `Verified on attempt ${fallbackResult.validationAttempts} of 3` });
                  } else {
                    set({ extractionPhase: "Data verified ✓" });
                  }
                }
              }
            } catch (err: any) {
              if ((err as any).code === "PAYMENT_REQUIRED") throw err;
              console.warn(`[PIPELINE] Vision failed for ${chunkLabel}: ${err.message}`);
              toast.warning(`Pages ${chunkStart}-${chunkEnd}: ${err.message}`);
            }
          }

          // Step 3: Credit remaining 70%
          completedWeight += chunkPageCount * API_WEIGHT;
          pagesFullyProcessed += chunkPageCount;
          updateProgress(pagesFullyProcessed);

          // Step 4: Append results progressively
          if (newRows.length > 0) {
            const updated = [...get().rows, ...newRows];
            set({ rows: updated });
            saveRows(updated);
            totalDenialsFound += newRows.length;
            toast.success(
              `Found ${newRows.length} denial(s) in pages ${chunkStart}-${chunkEnd}`
            );
          }

          // Step 5: Free memory
          canvas.width = 1;
          canvas.height = 1;
          ctx.clearRect(0, 0, 1, 1);
        }
      }

      // Done
      set({ progressPercent: 100, queuedFiles: [] });

      if (totalDenialsFound > 0) {
        toast.success(
          `Done! Found ${totalDenialsFound} denied claim(s) across ${grandTotalPages} pages.`
        );
      } else {
        toast.warning("No denied claims found in any of the uploaded EOBs.");
      }
    } catch (err: any) {
      if ((err as any).code === "PAYMENT_REQUIRED") {
        // Clean UI — set flag for the upgrade modal, no console.error
        set({ trialExpired: true });
      } else {
        console.error("[PIPELINE FATAL]", err);
        toast.error(err.message || "Failed to process PDFs. Please try again.");
      }
    } finally {
      set({
        isExtracting: false,
        extractionProgress: "",
        extractionPhase: "",
        progressPercent: 0,
        progressPagesProcessed: 0,
        progressTotalPages: 0,
      });
    }
  },
}));
