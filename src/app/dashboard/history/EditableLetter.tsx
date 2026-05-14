"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

export default function EditableLetter({ 
  appealId, 
  initialLetter,
  insuranceCompany,
  dateOfService
}: { 
  appealId: string; 
  initialLetter: string | null;
  insuranceCompany?: string | null;
  dateOfService?: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [letterContent, setLetterContent] = useState(initialLetter || "");
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("appeals")
      .update({ generated_letter: letterContent })
      .eq("id", appealId);
      
    setIsSaving(false);
    
    if (error) {
      toast.error("Failed to save changes: " + error.message);
    } else {
      toast.success("Letter updated successfully!");
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="p-6 bg-neutral-950/50 border-t border-white/5 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed relative group">
        <div className="absolute top-4 right-4 flex gap-2">
          <button 
            type="button"
            onClick={() => setIsEditing(true)}
            className="bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white rounded px-3 py-1.5 transition-colors border border-white/10 text-xs font-medium"
          >
             Edit Letter
          </button>
          <button 
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(letterContent);
              toast.success("Copied to clipboard!");
            }}
            className="bg-white/10 hover:bg-white/20 text-white rounded p-1.5 transition-colors border border-white/5"
            aria-label="Copy to clipboard"
            title="Copy Text"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
          <button 
            type="button"
            onClick={async () => {
              const format = localStorage.getItem("reclaim_export_format") || "txt";
              const dosName = dateOfService ? dateOfService.replace(/\//g, '-') : 'Unknown_DOS';
              const baseName = `Appeal_${insuranceCompany || 'Payer'}_${dosName}`;

              if (format === "docx") {
                const lines = (letterContent || "").split("\n");
                const doc = new Document({
                  sections: [{
                    properties: {},
                    children: lines.map((line, i) =>
                      new Paragraph({
                        children: [new TextRun({ text: line, size: 24, font: "Calibri" })],
                        spacing: { after: 120 },
                      })
                    ),
                  }],
                });
                const blob = await Packer.toBlob(doc);
                saveAs(blob, `${baseName}.docx`);
              } else {
                const element = document.createElement("a");
                const file = new Blob([letterContent || ""], { type: "text/plain" });
                element.href = URL.createObjectURL(file);
                element.download = `${baseName}.txt`;
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }
              toast.success("Download started!");
            }}
            className="bg-white/10 hover:bg-white/20 text-white rounded p-1.5 transition-colors border border-white/5"
            aria-label="Download document"
            title={`Download (.${typeof window !== 'undefined' ? localStorage.getItem('reclaim_export_format') || 'txt' : 'txt'})`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          </button>
        </div>
        <div className="mt-2 pr-24">
          {letterContent || "No letter content found."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-neutral-900/80 border-t border-indigo-500/30">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          Editing Mode Active
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setLetterContent(initialLetter || ""); }} className="text-neutral-400 hover:text-white hover:bg-white/5">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
      <textarea
        value={letterContent}
        onChange={(e) => setLetterContent(e.target.value)}
        className="w-full min-h-[400px] bg-neutral-950/80 border border-indigo-500/20 text-white p-4 rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-y custom-scrollbar"
      />
    </div>
  );
}
