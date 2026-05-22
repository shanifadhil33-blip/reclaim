import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
        <div className="text-2xl font-semibold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-400">
          Reclaim
        </div>
        <nav className="flex gap-4 items-center">
          <Link href="/login" className={buttonVariants({ variant: "secondary", className: "bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md transition-all rounded-full px-6" })}>
            Log In
          </Link>
          <Link href="/login?mode=signup" className={buttonVariants({ variant: "secondary", className: "bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md transition-all rounded-full px-6" })}>
            Get Started
          </Link>
        </nav>
      </header>

      <main className="min-h-screen flex flex-col items-center justify-center text-center px-4 relative pt-24">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-balance leading-tight">
            Drop your EOB. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 pb-2">Get appeal letters.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto text-balance font-medium leading-relaxed">
            Upload any Explanation of Benefits PDF. Reclaim reads every page, ignores the paid claims, extracts only the denials, and generates compliant appeal letters in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-8">
            <Link href="/login?mode=signup" className="inline-flex items-center justify-center font-medium h-14 px-8 text-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-all duration-300 ease-in-out hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] rounded-full">
              Sign Up Free
            </Link>
          </div>
        </div>
      </main>

      {/* How It Works */}
      <section className="relative z-10 py-24 mt-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              From EOB to Appeal Letter in 3 Steps.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-2xl relative transition-all duration-300 hover:bg-white/10">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] border-4 border-neutral-950">1</div>
              <h3 className="text-xl font-semibold text-white mb-4 mt-2">Drop Your EOB</h3>
              <div className="space-y-4 text-sm">
                <p className="text-neutral-300"><strong className="text-indigo-400">What you do:</strong> Upload the EOB PDF you received from the insurance company.</p>
                <p className="text-neutral-400"><strong className="text-neutral-500">What we do:</strong> We render every page, scan for denial codes (CO, PR, PI, OA), and extract only the denied line items into a clean triage list.</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-2xl relative transition-all duration-300 hover:bg-white/10">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] border-4 border-neutral-950">2</div>
              <h3 className="text-xl font-semibold text-white mb-4 mt-2">Paste the Clinicals</h3>
              <div className="space-y-4 text-sm">
                <p className="text-neutral-300"><strong className="text-emerald-400">What you do:</strong> Click any denied claim and paste the doctor's raw clinical notes from the EMR.</p>
                <p className="text-neutral-400"><strong className="text-neutral-500">What we do:</strong> Our AI cross-references the denial code with the clinical documentation to build a medical necessity argument.</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-2xl relative transition-all duration-300 hover:bg-white/10">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-[0_0_15px_rgba(147,51,234,0.5)] border-4 border-neutral-950">3</div>
              <h3 className="text-xl font-semibold text-white mb-4 mt-2">Generate & Send</h3>
              <div className="space-y-4 text-sm">
                <p className="text-neutral-300"><strong className="text-purple-400">What you do:</strong> Click "Generate" — copy, download, or paste the finished appeal directly into the payer portal.</p>
                <p className="text-neutral-400"><strong className="text-neutral-500">What we do:</strong> We synthesize a HIPAA-compliant, legally persuasive appeal letter formatted to overturn the denial.</p>
              </div>
            </div>
          </div>

          {/* ROI Box */}
          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 md:p-10 rounded-[2rem] relative overflow-hidden transition-all duration-300 hover:bg-white/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
            <h3 className="text-2xl font-semibold text-white mb-4 relative z-10">You shouldn't have to write off revenue because you ran out of hours.</h3>
            <p className="text-neutral-300 leading-relaxed text-lg mb-6 relative z-10">
              A single appeal letter takes 30 to 45 minutes to draft manually. At volume, it's physically impossible to fight every denial — so money gets left on the table.
            </p>
            <p className="text-emerald-400 font-medium text-lg relative z-10">
              Reclaim turns a 30-minute drafting task into a 15-second copy-paste. Fight every single denial. Recover every dollar.
            </p>
          </div>
          
          <div className="mt-16 text-center relative z-10">
            <Link href="/login?mode=signup" className="inline-flex items-center justify-center font-medium h-12 px-8 text-md bg-indigo-600 text-white hover:bg-indigo-500 transition-all duration-300 ease-in-out hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] rounded-full">
              Start Free Trial Today
            </Link>
          </div>
        </div>
      </section>

      {/* Security */}
      <div className="pt-24 pb-16 relative z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 text-center relative z-20">
          <div className="inline-flex items-center justify-center gap-2 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]"><path d="m12 22-7-3.5v-6c0-4.4 3.6-8 8-8s8 3.6 8 8v6z"/><path d="m9 12 2 2 4-4"/></svg>
            <h2 className="text-xl font-semibold text-neutral-200">HIPAA Compliant</h2>
          </div>
          <p className="text-sm text-neutral-400 max-w-3xl mx-auto mb-8 leading-relaxed">
            Your EOB data is rendered locally in your browser. Only the page images are sent to the AI for extraction. No raw patient data is stored on our servers beyond your encrypted appeal history.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 relative z-10 text-center text-sm text-neutral-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/hipaa" className="hover:text-neutral-300 transition-colors">HIPAA Compliance</Link>
          <Link href="/privacy" className="hover:text-neutral-300 transition-colors">Privacy Policy</Link>
          <Link href="/contact" className="hover:text-neutral-300 transition-colors">Contact</Link>
        </div>
        <p>© {new Date().getFullYear()} Reclaim. All rights reserved.</p>
      </footer>
    </div>
  );
}
