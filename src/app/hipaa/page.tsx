import Link from "next/link";

export default function HIPAAPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 md:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-neutral-400 hover:text-white transition-colors mb-8 -ml-4 inline-flex items-center gap-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">HIPAA Compliance</h1>
        <p className="text-neutral-500 font-medium">Last updated: May 2026</p>

        <div className="prose prose-invert prose-neutral max-w-none text-neutral-300 space-y-6">
          <p className="text-lg leading-relaxed">
            HIPAA (Health Insurance Portability and Accountability Act) establishes federal standards for the protection of individually identifiable health information. Reclaim is engineered to comply with these standards at every layer of our architecture.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">1. Browser-Local PDF Processing</h2>
          <p className="leading-relaxed">
            When you upload an EOB PDF, the document is rendered entirely inside your web browser using PDF.js. The raw PDF file is <strong className="text-white">never uploaded to any server</strong>. Only the rendered page images are transmitted — over an encrypted HTTPS connection — to the AI for denial extraction.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">2. Data Encryption</h2>
          <p className="leading-relaxed">
            All data transmitted between your browser and our servers is encrypted using TLS 1.2+. Your saved appeal letters are stored in a Supabase PostgreSQL database with encryption at rest. Row Level Security (RLS) policies ensure that only your authenticated session can access your records.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">3. AI Processing & Zero Retention</h2>
          <p className="leading-relaxed">
            EOB page images and clinical notes are sent to third-party AI models (via OpenRouter) solely for the purpose of data extraction and letter generation. We select AI providers that offer zero-retention data processing policies, meaning your PHI is not stored, logged, or used for model training by the AI provider.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">4. Authentication & Access Control</h2>
          <p className="leading-relaxed">
            Reclaim uses Supabase Auth with email/password authentication and OTP (One-Time Password) verification for new accounts. Sessions are cryptographically signed and expire automatically. No Reclaim employee has direct access to your unencrypted patient data.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">5. Your Responsibilities</h2>
          <p className="leading-relaxed">
            As a HIPAA-covered entity or business associate, you are responsible for ensuring that your use of Reclaim complies with your own organization's HIPAA policies. This includes using the tool on secured devices, maintaining strong passwords, and logging out of shared workstations.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">6. Contact</h2>
          <p className="leading-relaxed">
            For questions about our security practices or to request a Business Associate Agreement (BAA), please contact us at <a href="mailto:support@reclaimapp.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">support@reclaimapp.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
