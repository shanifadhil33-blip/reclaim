import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-6 group">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
          Back to Dashboard
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">Contact & Support</h1>
        <p className="text-neutral-400">Have a question, need help, or found a bug? We&apos;re here to help.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* WhatsApp Card */}
        <a
          href="https://wa.me/971506884500"
          target="_blank"
          rel="noopener noreferrer"
          className="group shadow-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-white rounded-xl p-8 relative overflow-hidden hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-300 cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[80px] group-hover:bg-emerald-500/20 transition-all" />

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">WhatsApp</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-4">
            Chat with us directly for quick support, bug reports, or payment concerns.
          </p>

          <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
            <span>+971 50 688 4500</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </div>
        </a>

        {/* Email Card */}
        <a
          href="mailto:Mindmoneyplug@gmail.com"
          className="group shadow-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-white rounded-xl p-8 relative overflow-hidden hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-300 cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] group-hover:bg-indigo-500/20 transition-all" />

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">Email</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-4">
            For detailed inquiries, billing questions, feature requests, or anything else.
          </p>

          <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm">
            <span>Mindmoneyplug@gmail.com</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </div>
        </a>
      </div>

      {/* Support Note */}
      <div className="mt-10 text-center">
        <p className="text-neutral-500 text-sm">
          We typically respond within a few hours. For urgent issues, WhatsApp is the fastest way to reach us.
        </p>
      </div>
    </div>
  );
}
