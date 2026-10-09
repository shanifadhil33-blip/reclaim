import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function PrivacyPage() {
  return (
    <PublicShell back={{ href: "/", label: "Home" }}>
      <article className="mx-auto max-w-3xl space-y-6 text-neutral-300">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Privacy note</h1>
        <p className="text-neutral-500">Updated October 2026</p>
        <p>Reclaim is a portfolio project by Adhil Shanif. It is not a medical product and not for real patient information.</p>
        <h2 className="pt-2 text-2xl font-semibold text-white">Account</h2>
        <p>Sign-in is Google only, through Supabase. The app stores the email address and name Google sends. There is no password, no payment, and no device fingerprint.</p>
        <h2 className="pt-2 text-2xl font-semibold text-white">What happens to a file</h2>
        <p>
          An uploaded PDF is rendered in the browser. Page images, and sometimes text taken from those pages, are sent to this app&apos;s server and then to whichever AI provider is configured (Gemini, Groq, or OpenRouter). The requests do not set a zero-retention or no-training option. Do not send real patient information.
        </p>
        <p>
          Denied-claim rows are saved in this browser&apos;s localStorage. They stay after you close the tab. Signing out clears them. A different Google account on the same browser does not see the previous account&apos;s rows.
        </p>
        <p>
          If you generate a letter, the app saves the payer, date of service, codes, denial text, the notes you pasted, the patient account value, and the letter in Supabase. Row Level Security limits those rows to your account. The database owner can still read them with the project admin key. Disk encryption is the host&apos;s, not end-to-end encryption.
        </p>
        <h2 className="pt-2 text-2xl font-semibold text-white">Other data</h2>
        <p>Error reports can be sent to Sentry. Session Replay is off. The public demo keeps its sample letters in the browser only.</p>
        <h2 className="pt-2 text-2xl font-semibold text-white">Deleting data</h2>
        <p>
          You can delete appeal records from History. There is no button that deletes the whole account. Email{" "}
          <a href="mailto:shanifadhil33@gmail.com" className="text-indigo-300 hover:text-indigo-200">
            shanifadhil33@gmail.com
          </a>
          .
        </p>
        <h2 className="pt-2 text-2xl font-semibold text-white">Letters are drafts</h2>
        <p>
          Generated letters come from a language model. Read them before you use them. This is not legal or medical advice. The data note is on the{" "}
          <Link href="/hipaa" className="text-indigo-300 hover:text-indigo-200">
            data note
          </Link>{" "}
          page.
        </p>
      </article>
    </PublicShell>
  );
}
