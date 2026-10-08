import { BackLink } from "@/components/back-link";

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-xl pb-12">
      <BackLink href="/dashboard" label="Worklist" />
      <h1 className="text-3xl font-semibold tracking-tight text-white">Contact</h1>
      <p className="mt-2 text-neutral-400">Questions about this portfolio project go to one inbox.</p>
      <a
        href="mailto:shanifadhil33@gmail.com"
        className="mt-8 flex min-h-24 flex-col justify-center rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10"
      >
        <span className="text-sm text-neutral-400">Email</span>
        <span className="mt-1 text-lg font-medium text-white">shanifadhil33@gmail.com</span>
      </a>
    </div>
  );
}
