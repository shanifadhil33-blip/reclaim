import Link from "next/link";

export default function DataNotePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 md:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-neutral-400 hover:text-white transition-colors mb-8 -ml-4 inline-flex items-center gap-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Data note</h1>
        <p className="text-neutral-500 font-medium">Updated October 2026</p>

        <div className="text-neutral-300 space-y-6 leading-relaxed">
          <p>
            Reclaim is a portfolio project. It is not a HIPAA product, not a covered service, and not a business associate. There is no Business Associate Agreement.
          </p>
          <p>
            Do not upload real explanations of benefits or paste real patient notes. Use fictional data only.
          </p>
          <p>
            The longer description of what the app actually stores is on the <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 transition-colors">privacy note</Link>.
          </p>
          <p>
            Questions: <a href="mailto:shanifadhil33@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">shanifadhil33@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
