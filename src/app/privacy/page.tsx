import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 md:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-neutral-400 hover:text-white transition-colors mb-8 -ml-4 inline-flex items-center gap-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy & Terms of Use</h1>
        <p className="text-neutral-500 font-medium">Last updated: May 2026</p>

        <div className="prose prose-invert prose-neutral max-w-none text-neutral-300 space-y-6">
          
          <h2 className="text-2xl font-semibold text-white pt-6">1. What We Collect</h2>
          <p className="leading-relaxed">
            <strong className="text-white">Account Data:</strong> When you sign up, we collect your email address and a hashed password. We do not collect your name, phone number, or physical address unless you voluntarily provide it in your Practice Defaults settings.
          </p>
          <p className="leading-relaxed">
            <strong className="text-white">Usage Data:</strong> We log basic analytics (page views, feature usage counts) to improve the product. We do not track you across other websites.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">2. How We Handle Your EOB Data</h2>
          <p className="leading-relaxed">
            Your EOB PDF is rendered locally in your browser. The raw file is never uploaded to our servers. Rendered page images are sent to AI providers for denial extraction. We do not store the raw images after processing. Only the structured extraction results (patient account numbers, denial codes, dates) are kept in your session memory until you close the browser.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">3. What We Store</h2>
          <p className="leading-relaxed">
            When you generate an appeal letter, the following are saved to your encrypted database record: the insurance company name, date of service, procedure code, denial code, your pasted clinical notes, the patient account number, and the generated letter text. These records are accessible only to you via Row Level Security.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">4. Third-Party AI Processing</h2>
          <p className="leading-relaxed">
            We use OpenRouter to route AI requests to models from Google (Gemini), Meta (Llama), and other providers. We select providers that offer zero-retention policies for API data. Your clinical data is not used to train any AI model.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">5. Payment Processing</h2>
          <p className="leading-relaxed">
            Payments are handled by Polar.sh. We never see or store your credit card number. Polar processes payments in compliance with PCI DSS standards and sends us only your subscription status.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">6. Data Deletion</h2>
          <p className="leading-relaxed">
            You can delete individual appeal records or your entire history from the Appeal History page. If you wish to delete your entire account and all associated data, contact us at <a href="mailto:support@reclaimapp.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">support@reclaimapp.com</a>.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">7. Terms of Use</h2>
          <p className="leading-relaxed">
            By using Reclaim, you agree that: (a) the generated appeal letters are AI-assisted drafts and should be reviewed before submission; (b) Reclaim is not a law firm and does not provide legal advice; (c) you are responsible for verifying the accuracy of all generated content; (d) you will not use the service for any purpose other than legitimate medical billing appeals.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-6">8. Contact</h2>
          <p className="leading-relaxed">
            For privacy questions, data deletion requests, or BAA inquiries: <a href="mailto:support@reclaimapp.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">support@reclaimapp.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
