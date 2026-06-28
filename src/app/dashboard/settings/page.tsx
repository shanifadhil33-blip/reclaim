"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: "error" | "success", text: string } | null>(null);

  // Export format preference
  const [exportFormat, setExportFormat] = useState<"txt" | "docx">("txt");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
       if (user) {
         setUserEmail(user.email ?? null);
         setUserId(user.id);
         setUserAvatar(user.user_metadata?.avatar_url ?? null);
         setUserName(user.user_metadata?.full_name ?? null);
       }
    });
    // Load saved export preference
    const saved = localStorage.getItem("reclaim_export_format");
    if (saved === "docx" || saved === "txt") setExportFormat(saved);
  }, []);

  const handleExportFormatChange = (format: "txt" | "docx") => {
    setExportFormat(format);
    localStorage.setItem("reclaim_export_format", format);
  };

  const handleSubmitFeedback = async () => {
    setFeedbackStatus(null);
    if (!feedbackText.trim()) {
      return setFeedbackStatus({ type: "error", text: "Please enter your feedback first." });
    }
    if (!userId) return;

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: feedbackText }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setFeedbackStatus({ type: "error", text: data.error || "Failed to send feedback." });
      } else {
        setFeedbackStatus({ type: "success", text: "Thanks! Your feedback has been sent directly to the development team." });
        setFeedbackText("");
      }
    } catch {
      setFeedbackStatus({ type: "error", text: "Network error. Please try again." });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-6 group">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
          Back to Dashboard
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-neutral-400">Manage your account and preferences.</p>
      </div>
      
      <div className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-white rounded-xl p-8 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px]" />
        
        {/* Account Profile — Google Identity */}
        <div>
           <h2 className="text-xl font-bold mb-1">Account Profile</h2>
           <p className="text-sm text-neutral-400 mb-4">Authenticated via Google.</p>
           <div className="flex items-center gap-4 bg-neutral-900/50 border border-white/10 rounded-lg p-4 max-w-md">
             {userAvatar ? (
               <img src={userAvatar} alt="Profile" className="w-10 h-10 rounded-full border border-white/10" referrerPolicy="no-referrer" />
             ) : (
               <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm">
                 {userEmail?.charAt(0).toUpperCase() || "?"}
               </div>
             )}
             <div className="min-w-0">
               {userName && <p className="text-sm font-semibold text-white truncate">{userName}</p>}
               <p className="text-sm text-emerald-400 font-mono truncate">{userEmail || "Loading..."}</p>
             </div>
             <div className="ml-auto flex items-center gap-1.5 text-[11px] text-neutral-500 flex-shrink-0">
               <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
                 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
               </svg>
               Google
             </div>
           </div>
        </div>

        {/* Personal Preferences */}
        <div className="border-t border-white/10 pt-8 max-w-md">
           <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
             Personal Preferences
           </h2>
           <p className="text-sm text-neutral-400 mb-6">Customize your default export format for generated appeal letters.</p>
           
           <div>
             <Label className="text-neutral-300 text-sm font-medium mb-3 block">Default Export Format</Label>
             <div className="flex gap-3">
               <button
                 onClick={() => handleExportFormatChange("txt")}
                 className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                   exportFormat === "txt"
                     ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                     : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white"
                 }`}
               >
                 <div className="font-bold">.txt</div>
                 <div className="text-xs mt-1 opacity-70">Plain text — for pasting or faxing</div>
               </button>
               <button
                 onClick={() => handleExportFormatChange("docx")}
                 className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                   exportFormat === "docx"
                     ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                     : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white"
                 }`}
               >
                 <div className="font-bold">.docx</div>
                 <div className="text-xs mt-1 opacity-70">Word document — for printing</div>
               </button>
             </div>
           </div>
        </div>

        {/* Feedback */}
        <div className="border-t border-white/10 pt-8 max-w-2xl mt-8">
           <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
             Feedback & Suggestions
           </h2>
           <p className="text-sm text-neutral-400 mb-6">Have an idea to improve Reclaim? Notice a bug? Let us know so we can build it.</p>
           
           {feedbackStatus && (
             <div className={`p-3 mb-4 rounded-md text-sm font-medium border ${feedbackStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
               {feedbackStatus.text}
             </div>
           )}

           <div className="space-y-4">
             <div>
               <Label className="text-neutral-300">Your Message</Label>
               <textarea 
                 rows={4}
                 placeholder="I'd love it if Reclaim could..." 
                 value={feedbackText} 
                 onChange={e => setFeedbackText(e.target.value)} 
                 className="w-full rounded-md bg-neutral-900/50 border border-white/10 text-white mt-1 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-neutral-600 custom-scrollbar resize-none"
               />
             </div>
           </div>
           
           <Button onClick={handleSubmitFeedback} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">
             Send Feedback
           </Button>
        </div>

        {/* Security Info */}
        <div className="border-t border-white/10 pt-8 max-w-md">
           <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="m12 22-7-3.5v-6c0-4.4 3.6-8 8-8s8 3.6 8 8v6z"/><path d="m9 12 2 2 4-4"/></svg>
             Security
           </h2>
           <p className="text-sm text-neutral-400 mb-4">Your account is secured by Google OAuth 2.0 — no passwords are stored on our servers.</p>
           <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-4 text-sm text-emerald-300/80 space-y-1">
             <p>✓ Two-factor authentication managed by Google</p>
             <p>✓ Session encryption via Supabase Auth</p>
             <p>✓ No passwords stored or transmitted</p>
           </div>
        </div>

        {/* Logout */}
        <div className="border-t border-white/10 pt-8 mt-8">
           <p className="text-sm text-neutral-400 mb-6">Terminate your active encrypted session.</p>
           <Button 
             type="button" 
             onClick={() => setShowLogoutDialog(true)} 
             variant="outline" 
             className="bg-white/5 text-white hover:bg-white/10 border border-white/10 transition-all duration-300 ease-in-out"
           >
              Log Out
           </Button>
        </div>

      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowLogoutDialog(false)}
        >
          <div
            className="w-full max-w-md mx-4 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-400"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Log Out?
                </h3>
                <p className="text-neutral-400 text-xs">
                  Are you sure you want to end your current session?
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-300 leading-relaxed mb-6">
              You will need to sign in again to access your Explanation of Benefits documents and appeals history.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowLogoutDialog(false)}
                className="h-10 px-4 text-sm font-medium rounded-lg border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10 hover:text-white transition-all"
              >
                Cancel
              </button>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="h-10 px-4 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all"
                >
                  Log Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
