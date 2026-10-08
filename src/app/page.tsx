import Link from "next/link";
import { PortfolioNotice } from "@/components/portfolio-notice";
import { PublicShell } from "@/components/public-shell";

const steps = [
  {
    n: "1",
    title: "Drop an EOB",
    body: "In the signed-in app, upload a PDF. Reclaim looks for denied lines and lists them.",
    tone: "bg-indigo-600",
  },
  {
    n: "2",
    title: "Paste notes",
    body: "Open a denial and paste the notes you want the draft to use. Read them first.",
    tone: "bg-emerald-600",
  },
  {
    n: "3",
    title: "Draft a letter",
    body: "The letter is a starting point. Copy it, download it, or edit it. Nothing is filed for you.",
    tone: "bg-purple-600",
  },
];

export default function LandingPage() {
  return (
    <PublicShell>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/2 h-[420px] w-full max-w-[720px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="relative mx-auto max-w-3xl space-y-8 py-10 text-center sm:py-16">
          <PortfolioNotice className="rounded-2xl text-left sm:text-center" />
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Drop your EOB.{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Get appeal letters.
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-400">
            A portfolio project for drafting insurance appeal letters. Try four fictional denials with no account, or sign in to upload your own files.
          </p>
          <Link
            href="/demo"
            className="inline-flex h-14 items-center justify-center rounded-full bg-neutral-100 px-8 text-lg font-medium text-neutral-950 hover:bg-white"
          >
            Try the demo
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <article key={step.n} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${step.tone}`}>
              {step.n}
            </div>
            <h2 className="mb-2 text-xl font-semibold text-white">{step.title}</h2>
            <p className="text-sm leading-relaxed text-neutral-400">{step.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h2 className="mb-3 text-xl font-semibold text-white">How files are handled</h2>
        <p className="leading-relaxed text-neutral-400">
          In the signed-in app, a PDF is rendered in the browser and page images are sent to an AI provider. Denied rows stay in that browser until you delete them. A generated letter is saved to your account. This is not end-to-end encryption, and it is not a HIPAA product. Use fictional data only.
        </p>
      </section>
    </PublicShell>
  );
}
