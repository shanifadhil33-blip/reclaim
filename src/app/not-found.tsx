import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function NotFound() {
  return (
    <PublicShell back={{ href: "/", label: "Home" }}>
      <div className="mx-auto max-w-lg py-10 text-center">
        <h1 className="text-3xl font-semibold text-white">Page not found</h1>
        <p className="mt-3 text-neutral-400">That address is not part of Reclaim.</p>
        <Link
          href="/demo"
          className="mt-8 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-medium text-neutral-950"
        >
          Try the demo
        </Link>
      </div>
    </PublicShell>
  );
}
