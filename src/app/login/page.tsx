"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PortfolioNotice } from "@/components/portfolio-notice";
import { PublicShell } from "@/components/public-shell";

function AuthContent() {
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");
  const [oauthError, setOauthError] = useState(false);
  const [loading, setLoading] = useState(false);
  const message = oauthError || queryError ? "Couldn't sign in. Try again." : null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setOauthError(false);
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" });

      const next = searchParams.get("next");
      const redirectTo = new URL("/auth/callback", window.location.origin);
      if (next?.startsWith("/")) {
        redirectTo.searchParams.set("next", next);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      console.error("[LOGIN]", err instanceof Error ? err.message : "sign-in failed");
      setOauthError(true);
      setLoading(false);
    }
  };

  return (
    <PublicShell back={{ href: "/", label: "Home" }}>
      <div className="mx-auto w-full max-w-sm space-y-6 py-6">
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white">Sign in</h1>
          <p className="text-sm text-neutral-400">Google only. A new account is created the first time you sign in.</p>
          <PortfolioNotice className="rounded-xl text-left" />
        </div>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          {message ? (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-300" role="alert">
              {message}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void handleGoogleSignIn();
            }}
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-white text-[15px] font-semibold text-neutral-900 disabled:cursor-wait disabled:bg-neutral-300"
          >
            {loading ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-400 border-t-neutral-800" />
                Signing in…
              </>
            ) : (
              "Sign in with Google"
            )}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-neutral-500">
            By continuing, you agree to the{" "}
            <Link href="/privacy" className="text-neutral-300 underline underline-offset-2 hover:text-white">
              privacy note
            </Link>
            .
          </p>
        </div>
      </div>
    </PublicShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-neutral-950" />}>
      <AuthContent />
    </Suspense>
  );
}
