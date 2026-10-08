"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExtractionStore } from "@/stores/extraction-store";

const LINKS = [
  { href: "/dashboard", label: "Worklist", exact: true },
  { href: "/dashboard/history", label: "History", exact: false },
  { href: "/dashboard/settings", label: "Settings", exact: false },
  { href: "/dashboard/contact", label: "Contact", exact: false },
];

type WakeLockSentinelLike = { release: () => Promise<void> };

export function AppHeader({ email }: { email: string }) {
  const pathname = usePathname();
  const isExtracting = useExtractionStore((state) => state.isExtracting);
  const progressPercent = useExtractionStore((state) => state.progressPercent);

  useEffect(() => {
    if (!isExtracting) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isExtracting]);

  useEffect(() => {
    if (!isExtracting) return;
    let wakeLock: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };

    async function acquire() {
      if (!nav.wakeLock || cancelled) return;
      try {
        wakeLock = await nav.wakeLock.request("screen");
      } catch {
        wakeLock = null;
      }
    }

    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !wakeLock) void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void wakeLock?.release().catch(() => undefined);
    };
  }, [isExtracting]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/90 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <Link href="/dashboard" className="inline-flex h-11 items-center text-xl font-semibold tracking-tight text-white">
          Reclaim
        </Link>
        <p className="max-w-[14rem] truncate text-xs text-neutral-400">{email}</p>
      </div>
      <nav className="flex flex-wrap gap-1 px-3 pb-2 sm:px-5">
        {LINKS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium ${
                active ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {isExtracting ? (
        <div className="px-4 pb-3 sm:px-6">
          <div className="mb-1 flex items-center justify-between text-xs text-amber-300">
            <span>Extracting</span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-amber-400 transition-[width] duration-700"
              style={{ width: `${Math.max(progressPercent, 3)}%` }}
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
