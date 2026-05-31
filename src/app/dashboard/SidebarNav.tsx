"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExtractionStore } from "@/stores/extraction-store";

export default function SidebarNav() {
  const pathname = usePathname();
  const isExtracting = useExtractionStore((s) => s.isExtracting);
  const progressPercent = useExtractionStore((s) => s.progressPercent);

  // ── Prevent tab closing, reloads, or navigating away during extraction ──
  useEffect(() => {
    if (!isExtracting) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // standard message (modern browsers show a generic warning, but it blocks the event)
      e.returnValue = "An extraction is currently in progress. If you leave or refresh, the extraction will be canceled.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isExtracting]);

  // ── Request Screen Wake Lock to prevent the screen/system from sleeping ──
  useEffect(() => {
    if (!isExtracting) return;

    let wakeLock: any = null;

    async function acquireWakeLock() {
      if (typeof window !== "undefined" && "wakeLock" in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request("screen");
          console.log("[WAKE LOCK] Acquired screen wake lock successfully.");
        } catch (err) {
          console.warn("[WAKE LOCK] Failed to acquire screen wake lock:", err);
        }
      }
    }

    acquireWakeLock();

    // Re-acquire lock if tab becomes visible again (e.g. user toggles away and returns)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !wakeLock) {
        acquireWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          console.log("[WAKE LOCK] Released screen wake lock.");
        }).catch((err: any) => {
          console.error("[WAKE LOCK] Failed to release screen wake lock:", err);
        });
      }
    };
  }, [isExtracting]);

  const navItems = [
    { name: "New Upload", href: "/dashboard" },
    { name: "Appeal History", href: "/dashboard/history" },
    { name: "Recycle Bin", href: "/dashboard/trash" },
    { name: "Billing", href: "/dashboard/billing" },
    { name: "Settings", href: "/dashboard/settings" },
    { name: "Contact", href: "/dashboard/contact" },
  ];

  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const isActive = item.href === "/dashboard" 
          ? pathname === "/dashboard" 
          : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`block px-4 py-2 rounded-lg font-medium transition-all duration-300 ease-in-out ${
              isActive
                ? "bg-white/10 backdrop-blur-sm text-white border border-white/10"
                : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
          >
            {item.name}
          </Link>
        );
      })}

      {/* Global extraction progress indicator — visible from any page */}
      {isExtracting && (
        <div className="mt-6 px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-300 font-medium">Extracting...</span>
            <span className="text-xs text-neutral-500 ml-auto font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(progressPercent, 3)}%` }}
            />
          </div>
        </div>
      )}
    </nav>
  );
}

