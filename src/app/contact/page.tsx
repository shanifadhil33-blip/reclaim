import { PublicShell } from "@/components/public-shell";

export default function ContactPage() {
  return (
    <PublicShell back={{ href: "/", label: "Home" }}>
      <div className="mx-auto max-w-xl py-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Contact</h1>
        <p className="mt-3 text-neutral-400">This inbox is checked by the person who built the project.</p>
        <a
          href="mailto:shanifadhil33@gmail.com"
          className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-lg font-medium text-neutral-950 hover:bg-neutral-200"
        >
          shanifadhil33@gmail.com
        </a>
      </div>
    </PublicShell>
  );
}
