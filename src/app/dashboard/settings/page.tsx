"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BackLink } from "@/components/back-link";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/client";

type ExportFormat = "txt" | "docx";

function readFormat(): ExportFormat {
  const saved = window.localStorage.getItem("reclaim_export_format");
  return saved === "docx" ? "docx" : "txt";
}

function subscribeFormat(onStoreChange: () => void) {
  window.addEventListener("reclaim-export-format", onStoreChange);
  return () => window.removeEventListener("reclaim-export-format", onStoreChange);
}

export default function SettingsPage() {
  const exportFormat = useSyncExternalStore(subscribeFormat, readFormat, () => "txt" as const);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (cancelled || !user) return;
        setUserEmail(user.email ?? null);
        setUserName(typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chooseFormat = (format: ExportFormat) => {
    window.localStorage.setItem("reclaim_export_format", format);
    window.dispatchEvent(new Event("reclaim-export-format"));
  };

  const initial = (userName || userEmail || "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-3xl pb-12">
      <BackLink href="/dashboard" label="Worklist" />
      <h1 className="text-3xl font-semibold tracking-tight text-white">Settings</h1>
      <p className="mt-2 text-neutral-400">The Google account signed in on this browser.</p>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Account</h2>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200">
            {initial}
          </div>
          <div className="min-w-0">
            {userName ? <p className="truncate text-sm font-medium text-white">{userName}</p> : null}
            <p className="truncate text-sm text-neutral-400">{userEmail ?? "Loading account…"}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-neutral-400">
          Sign-in is Google only. This app does not store a password. There is no button here that deletes the account. Email shanifadhil33@gmail.com to ask for that.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Download format</h2>
        <p className="mt-1 text-sm text-neutral-400">Used when you download a batch of letters from History.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["txt", "docx"] as const).map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => chooseFormat(format)}
              className={`h-16 rounded-xl border px-4 text-left text-sm ${
                exportFormat === format
                  ? "border-indigo-400/50 bg-indigo-500/15 text-white"
                  : "border-white/10 bg-black/20 text-neutral-300"
              }`}
            >
              <span className="block font-semibold">.{format}</span>
              <span className="text-xs text-neutral-400">{format === "txt" ? "Plain text" : "Word document"}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Sign out</h2>
        <p className="mt-1 mb-4 text-sm text-neutral-400">Ends this browser session.</p>
        <SignOutButton />
      </section>
    </div>
  );
}
