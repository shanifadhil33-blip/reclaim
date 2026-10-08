import { BackLink } from "@/components/back-link";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";

export function PublicShell({
  children,
  back,
}: {
  children: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-neutral-950 text-neutral-50">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {back ? <BackLink href={back.href} label={back.label} /> : null}
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
