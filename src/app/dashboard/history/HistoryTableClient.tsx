"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import EditableLetter from "./EditableLetter";
import { DeleteAppealButton } from "./HistoryActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function HistoryTableClient({ initialAppeals }: { initialAppeals: any[] }) {
  const [appeals, setAppeals] = useState(initialAppeals || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Filter appeals based on search term (Payer or Code) and date
  const filteredAppeals = useMemo(() => {
    return appeals.filter(appeal => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm || 
        (appeal.insurance_company?.toLowerCase() || "").includes(searchLower) ||
        (appeal.medical_code?.toLowerCase() || "").includes(searchLower);
        
      const appealDate = new Date(appeal.created_at).toISOString().split('T')[0];
      const matchesDate = !dateFilter || appealDate === dateFilter;

      return matchesSearch && matchesDate;
    });
  }, [appeals, searchTerm, dateFilter]);

  // Handle Select All
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = new Set(filteredAppeals.map(a => a.id));
      setSelectedIds(allFilteredIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle Individual Selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = filteredAppeals.length > 0 && selectedIds.size === filteredAppeals.length;

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    setIsExporting(true);
    
    try {
      const [{ default: JSZip }, { saveAs }, docxModule] = await Promise.all([
        import("jszip"),
        import("file-saver"),
        import("docx"),
      ]);
      const { Document, Packer, Paragraph, TextRun } = docxModule;
      const zip = new JSZip();
      
      // Get the full appeal objects for the selected IDs
      const selectedAppeals = appeals.filter(a => selectedIds.has(a.id));
      
      const format = localStorage.getItem("reclaim_export_format") || "txt";

      for (let index = 0; index < selectedAppeals.length; index++) {
        const appeal = selectedAppeals[index];
        const payer = (appeal.insurance_company || "Payer").replace(/[^a-z0-9]/gi, '_');
        const dos = (appeal.date_of_service || "UnknownDOS").replace(/[^a-z0-9]/gi, '_');
        const code = (appeal.medical_code || "Code").replace(/[^a-z0-9]/gi, '_');
        
        if (format === "docx") {
          const fileName = `Appeal_${payer}_${dos}_${code}_${index + 1}.docx`;
          const lines = (appeal.generated_letter || "").split("\n");
          const doc = new Document({
            sections: [{
              properties: {},
              children: lines.map((line: string) =>
                new Paragraph({
                  children: [new TextRun({ text: line, size: 24, font: "Calibri" })],
                  spacing: { after: 120 },
                })
              ),
            }],
          });
          const blob = await Packer.toBlob(doc);
          zip.file(fileName, blob);
        } else {
          // Ensure unique filenames if there are exact duplicates
          const fileName = `Appeal_${payer}_${dos}_${code}_${index + 1}.txt`;
          zip.file(fileName, appeal.generated_letter || "");
        }
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "Reclaim_Appeals_Export.zip");
      toast.success(`Successfully exported ${selectedAppeals.length} appeals.`);
    } catch (error: any) {
      console.error("ZIP Export Error:", error);
      toast.error("Failed to export files. " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Remove an appeal from local state after deletion (the actual deletion happens in DeleteAppealButton via Supabase)
  const handleRemoveLocal = (id: string) => {
    setAppeals(current => current.filter(a => a.id !== id));
    if (selectedIds.has(id)) {
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    }
  };

  if (appeals.length === 0) {
    return (
      <div className="shadow-lg border border-white/10 bg-white/5 backdrop-blur-2xl text-white rounded-2xl p-12 text-center">
         <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        <h2 className="text-xl font-medium text-neutral-300">No Appeals Found</h2>
        <p className="text-neutral-500 mt-2">No appeals generated yet. When you generate appeals, they will be securely stored here so you can batch-download them later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Passive Hint & Filters */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-4">
        <div className="flex items-start gap-2 text-sm text-neutral-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-indigo-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <p>Tip: Need to print a batch for signatures? Click <strong>Manage</strong> to select and download multiple appeals in a single ZIP file.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input 
              type="text" 
              placeholder="Search by Payer or Code..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-neutral-950/50 border-white/10 text-white placeholder:text-neutral-500"
            />
          </div>
          <div className="w-full sm:w-48 shrink-0">
            <Input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              onClick={(e) => {
                const target = e.target as HTMLInputElement;
                if (target.showPicker) target.showPicker();
              }}
              className="bg-neutral-950/50 border-white/10 text-white placeholder:text-neutral-500 [color-scheme:dark] cursor-pointer"
            />
          </div>
          {!isSelectionMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSelectionMode(true)}
              className="bg-transparent border-white/20 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors h-10"
            >
              Manage
            </Button>
          )}
        </div>
      </div>

      {/* Selection Mode Action Bar */}
      {isSelectionMode && (
        <div className="sticky top-4 z-10 bg-neutral-900/80 border border-white/10 backdrop-blur-2xl rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 fade-in">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer hover:text-white transition-colors text-sm text-neutral-400">
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4"
              />
              {isAllSelected ? "Deselect All" : "Select All"}
            </label>
            <span className="text-neutral-500 text-sm">
              {selectedIds.size > 0 
                ? `${selectedIds.size} of ${filteredAppeals.length} selected` 
                : `${filteredAppeals.length} appeals`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <Button 
                onClick={handleBulkDownload}
                disabled={isExporting}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 px-4"
              >
                {isExporting ? "Bundling..." : `Download ${selectedIds.size} (.zip)`}
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

      {/* Results count */}
      <div className="flex items-center px-1 text-xs text-neutral-500">
        Showing {filteredAppeals.length} result{filteredAppeals.length !== 1 ? "s" : ""}
      </div>

      {/* Data List */}
      <div className="space-y-4">
        {filteredAppeals.map((appeal) => (
          <div key={appeal.id} className={`bg-white/5 backdrop-blur-md border rounded-2xl overflow-hidden transition-all duration-300 ease-in-out hover:bg-white/10 ${selectedIds.has(appeal.id) ? 'border-indigo-500/50' : 'border-white/10'}`}>
            <div className="p-5 border-b border-white/5 flex flex-wrap gap-x-8 gap-y-4 items-center justify-between">
              
              <div className="flex items-center gap-4">
                {isSelectionMode && (
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(appeal.id)}
                    onChange={() => toggleSelection(appeal.id)}
                    className="w-4 h-4 shrink-0 mt-0.5"
                  />
                )}
                
                <div className="flex flex-wrap gap-x-8 gap-y-4 items-center">
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">Created</div>
                    <div className="text-neutral-200 font-medium">{new Date(appeal.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">Payer</div>
                    <div className="text-neutral-200 font-medium">{appeal.insurance_company || "Unknown"}</div>
                  </div>
                  <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">DOS</div>
                    <div className="text-neutral-200 font-medium">{appeal.date_of_service || "Unknown"}</div>
                  </div>
                  <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-1">Code</div>
                    <div className="bg-neutral-800 px-2 py-0.5 rounded text-sm font-mono border border-white/5 text-neutral-200">{appeal.medical_code || "Unknown"}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-8">
                <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20">
                  Completed
                </Badge>
                <DeleteAppealButton appealId={appeal.id} onDeleted={() => handleRemoveLocal(appeal.id)} />
              </div>
            </div>
            
            <details className="group">
              <summary className="p-4 cursor-pointer text-sm font-medium text-indigo-400 hover:bg-white/10 transition-all duration-300 ease-in-out flex items-center justify-between list-none pl-12">
                View Generated Appeal Letter
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6"/></svg>
              </summary>
              <div className="pl-8">
                <EditableLetter 
                  appealId={appeal.id} 
                  initialLetter={appeal.generated_letter} 
                  insuranceCompany={appeal.insurance_company}
                  dateOfService={appeal.date_of_service}
                />
              </div>
            </details>
          </div>
        ))}

        {filteredAppeals.length === 0 && (
          <div className="py-12 text-center text-neutral-500 bg-neutral-900/30 border border-white/5 rounded-xl border-dashed">
            No appeals match your current search filters.
          </div>
        )}
      </div>
    </div>
  );
}
