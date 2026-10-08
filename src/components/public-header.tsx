"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkClass =
  "inline-flex h-11 items-center rounded-full px-4 text-sm font-medium transition-colors";

export function PublicHeader() {
  const pathname = usePathname();
  const onDemo = pathname === "/demo" || pathname.startsWith("/demo/");
  const onLogin = pathname === "/login" || pathname.startsWith("/login/");

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <Link href="/" className="inline-flex h-11 items-center text-xl font-semibold tracking-tight text-white">
          Reclaim
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/demo"
            className={`${linkClass} ${onDemo ? "bg-white/10 text-white" : "text-neutral-300 hover:bg-white/5 hover:text-white"}`}
            aria-current={onDemo ? "page" : undefined}
          >
            Try the demo
          </Link>
          <Link
            href="/login"
            className={`${linkClass} ${onLogin ? "bg-white text-neutral-950" : "bg-white text-neutral-950 hover:bg-neutral-200"}`}
            aria-current={onLogin ? "page" : undefined}
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
