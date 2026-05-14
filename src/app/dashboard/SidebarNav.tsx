"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExtractionStore } from "@/stores/extraction-store";

export default function SidebarNav() {
  const pathname = usePathname();
  const isExtracting = useExtractionStore((s) => s.isExtracting);
  const progressPercent = useExtractionStore((s) => s.progressPercent);

  const navItems = [
    { name: "New Upload", href: "/dashboard" },
    { name: "Appeal History", href: "/dashboard/history" },
    { name: "Recycle Bin", href: "/dashboard/trash" },
    { name: "Billing", href: "/dashboard/billing" },
    { name: "Settings", href: "/dashboard/settings" },
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
