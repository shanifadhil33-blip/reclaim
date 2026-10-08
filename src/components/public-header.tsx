"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicHeader() {
  const pathname = usePathname();
  const onLogin = pathname === "/login" || pathname.startsWith("/login/");

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <Link href="/" className="inline-flex h-11 items-center text-xl font-semibold tracking-tight text-white">
          Reclaim
        </Link>
        <Link
          href="/login"
          aria-current={onLogin ? "page" : undefined}
          className="inline-flex h-11 items-center rounded-full bg-white px-4 text-sm font-medium text-neutral-950 hover:bg-neutral-200"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
