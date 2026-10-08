import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function DataNotePage() {
  return (
    <PublicShell back={{ href: "/", label: "Home" }}>
      <article className="mx-auto max-w-3xl space-y-6 text-neutral-300">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Data note</h1>
        <p className="text-neutral-500">Updated October 2026</p>
        <p>
          Reclaim is a portfolio project. It is not a HIPAA product, not a covered service, and not a business associate. There is no Business Associate Agreement.
        </p>
        <p>Do not upload real explanations of benefits or paste real patient notes. Use fictional data only.</p>
        <p>
          The longer description of what the app stores is on the{" "}
          <Link href="/privacy" className="text-indigo-300 hover:text-indigo-200">
            privacy note
          </Link>
          .
        </p>
        <p>
          Questions:{" "}
          <a href="mailto:shanifadhil33@gmail.com" className="text-indigo-300 hover:text-indigo-200">
            shanifadhil33@gmail.com
          </a>
        </p>
      </article>
    </PublicShell>
  );
}
