import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 md:p-16 font-sans relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-xl mx-auto space-y-8 text-center mt-20 relative z-10">
        <Link href="/" className="text-neutral-400 hover:text-white transition-colors absolute -top-16 left-0 text-sm inline-flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight text-white">Contact Support</h1>
        <p className="text-neutral-400 text-lg leading-relaxed">
          Have a question about Reclaim or need help with your EOB processing? We're here to help.
        </p>
        <div className="pt-8 flex flex-col gap-4">
          <a href="mailto:support@reclaimapp.com" className="inline-flex items-center justify-center h-14 px-8 text-lg bg-white text-black hover:bg-neutral-200 rounded-full shadow-lg font-medium transition-all">
            Email support@reclaimapp.com
          </a>
          <p className="text-sm text-neutral-500 pt-4">We typically reply within 24 business hours.</p>
        </div>
      </div>
    </div>
  );
}
