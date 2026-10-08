import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 px-4 py-8 text-center text-sm text-neutral-500">
      <nav className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <Link href="/hipaa" className="inline-flex h-11 items-center hover:text-neutral-300">
          Data note
        </Link>
        <Link href="/privacy" className="inline-flex h-11 items-center hover:text-neutral-300">
          Privacy
        </Link>
        <Link href="/contact" className="inline-flex h-11 items-center hover:text-neutral-300">
          Contact
        </Link>
      </nav>
      <p>Built by Adhil Shanif</p>
    </footer>
  );
}
