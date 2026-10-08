import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex h-11 items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
