import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 md:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-neutral-400 hover:text-white transition-colors mb-8 -ml-4 inline-flex items-center gap-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Privacy note</h1>
        <p className="text-neutral-500 font-medium">Updated October 2026</p>

        <div className="text-neutral-300 space-y-6 leading-relaxed">
          <p>
            Reclaim is a portfolio project by Adhil Shanif. It is not a medical product and not for real patient information.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-2">Account</h2>
          <p>
            Sign-in is Google only, through Supabase. The app stores the email address and name Google sends with that sign-in. There is no password.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-2">What happens to a file</h2>
          <p>
            An uploaded PDF is rendered in the browser. Page images, and sometimes text taken from those pages, are sent to this app&apos;s server and then to OpenRouter. The models in the code include Google Gemini and free Llama, Gemma, and Mistral routes. The requests do not set a zero-retention or no-training option. Do not send real patient information.
          </p>
          <p>
            Denied-claim rows are saved in this browser&apos;s localStorage. They stay after you close the tab. Signing out clears them. A different Google account on the same browser does not see the previous account&apos;s rows.
          </p>
          <p>
            If you generate a letter, the app saves the payer, date of service, codes, denial text, the notes you pasted, the patient account value, and the letter in a Supabase database. Row Level Security limits those rows to your account. The database owner can still read them with the project admin key. The host encrypts disks at rest. That is not end-to-end encryption.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-2">Other data</h2>
          <p>
            A device fingerprint is stored so a second free account on the same browser can be blocked. Payments, if you subscribe, are handled by Polar. This app does not store card numbers. Feedback you submit is saved and may be emailed to the project owner. Error reports can be sent to Sentry. Session Replay is off.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-2">Deleting data</h2>
          <p>
            You can delete appeal records from Appeal History. There is no button that deletes the whole account. Email <a href="mailto:shanifadhil33@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">shanifadhil33@gmail.com</a> and ask for the account to be removed.
          </p>

          <h2 className="text-2xl font-semibold text-white pt-2">Letters are drafts</h2>
          <p>
            Generated letters come from a language model. Read them before you use them. This is not legal, medical, or billing advice.
          </p>
        </div>
      </div>
    </div>
  );
}
