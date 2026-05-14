"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mode, setMode] = useState<"standard" | "forgot" | "otp">("standard");
  const [statusMsg, setStatusMsg] = useState<{ type: "error" | "success", text: string } | null>(null);

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: "error" | "success", text: string } | null>(null);

  // Export format preference
  const [exportFormat, setExportFormat] = useState<"txt" | "docx">("txt");

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
       if (user) {
         setUserEmail(user.email ?? null);
         setUserId(user.id);
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

    const { error } = await supabase.from("feedback").insert({
      user_id: userId,
      message: feedbackText
    });

    if (error) {
      setFeedbackStatus({ type: "error", text: error.message });
    } else {
      setFeedbackStatus({ type: "success", text: "Thanks! Your feedback has been sent directly to the development team." });
      setFeedbackText("");
    }
  };

  const handleChangePasswordClick = async () => {
    setStatusMsg(null);
    if (!currentPassword || !newPassword) {
      return setStatusMsg({ type: "error", text: "Fill in both fields" });
    }
    if (!userEmail) return;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword
    });

    if (signInError) {
      return setStatusMsg({ type: "error", text: "Current password incorrect." });
    }

    const { error: updateError } = await supabase.auth.updateUser({
       password: newPassword
    });

    if (updateError) {
       setStatusMsg({ type: "error", text: updateError.message });
    } else {
       setStatusMsg({ type: "success", text: "Password updated successfully!" });
       setCurrentPassword("");
       setNewPassword("");
    }
  };

  const handleForgotPassword = async () => {
    if (!userEmail) return;
    setStatusMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
    if (error) {
       setStatusMsg({ type: "error", text: error.message });
    } else {
       setMode("otp");
       setStatusMsg({ type: "success", text: "OTP sent to your email!" });
    }
  };

  const handleVerifyOtp = async () => {
    setStatusMsg(null);
    if (!userEmail || !otpCode || !newPassword) return setStatusMsg({ type: "error", text: "Fill in OTP and New Password" });
    
    const { error } = await supabase.auth.verifyOtp({
       email: userEmail,
       token: otpCode,
       type: "recovery"
    });

    if (error) {
       setStatusMsg({ type: "error", text: "Invalid OTP code." });
       return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
       password: newPassword
    });

    if (updateError) {
       setStatusMsg({ type: "error", text: updateError.message });
    } else {
       setStatusMsg({ type: "success", text: "Password safely reset!" });
       setMode("standard");
       setOtpCode("");
       setNewPassword("");
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
        
        {/* Account Profile */}
        <div>
           <h2 className="text-xl font-bold mb-1">Account Profile</h2>
           <p className="text-sm text-neutral-400 mb-4">You are securely authenticated as:</p>
           <div className="bg-neutral-900/50 border border-white/10 rounded-md p-3 text-emerald-400 font-mono text-sm max-w-sm">
             {userEmail || "Loading..."}
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

        {/* Security */}
        <div className="border-t border-white/10 pt-8 max-w-md">
           <h2 className="text-xl font-bold mb-1">Security</h2>
           <p className="text-sm text-neutral-400 mb-6">Manage your password to preserve HIPAA compliance integrity.</p>
           
           {statusMsg && (
             <div className={`p-3 mb-4 rounded-md text-sm font-medium border ${statusMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
               {statusMsg.text}
             </div>
           )}

           {mode === "standard" && (
             <Button onClick={handleForgotPassword} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">
               Forgot Password
             </Button>
           )}

           {mode === "forgot" && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
               <div>
                  <Label className="text-neutral-300">Current Password</Label>
                  <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="bg-neutral-900/50 border-white/10 text-white mt-1"/>
               </div>
               <div>
                  <Label className="text-neutral-300">New Password</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-neutral-900/50 border-white/10 text-white mt-1"/>
               </div>
               <div className="flex gap-4 pt-2">
                 <Button onClick={handleChangePasswordClick} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">Update Password</Button>
                 <Button variant="ghost" onClick={() => { setMode("standard"); setStatusMsg(null); setCurrentPassword(""); setNewPassword(""); }} className="text-neutral-400 hover:text-white hover:bg-white/5 transition-all">Cancel</Button>
               </div>
             </div>
           )}

           {mode === "otp" && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
               <div>
                  <Label className="text-neutral-300">6-Digit OTP Code (Sent to Email)</Label>
                  <Input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value)} className="bg-neutral-900/50 border-white/10 text-emerald-400 mt-1 tracking-[0.25em] text-center font-mono text-xl py-6"/>
               </div>
               <div>
                  <Label className="text-neutral-300">Set New Password</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-neutral-900/50 border-white/10 text-white mt-1"/>
               </div>
               <div className="flex gap-4 pt-2">
                 <Button onClick={handleVerifyOtp} className="bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]">Verify & Reset</Button>
                 <Button variant="ghost" onClick={() => { setMode("standard"); setStatusMsg(null); }} className="text-neutral-400 hover:text-white hover:bg-white/5 transition-all">Cancel</Button>
               </div>
             </div>
           )}
        </div>

        {/* Logout */}
        <div className="border-t border-white/10 pt-8 mt-8">
           <p className="text-sm text-neutral-400 mb-6">Terminate your active encrypted session.</p>
           <form action="/auth/signout" method="post">
             <Button type="submit" variant="outline" className="bg-white/5 text-white hover:bg-white/10 border border-white/10 transition-all duration-300 ease-in-out">
                Log Out
             </Button>
           </form>
        </div>

      </div>
    </div>
  );
}
