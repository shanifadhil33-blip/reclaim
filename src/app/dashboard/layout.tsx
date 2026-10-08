import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PortfolioNotice } from "@/components/portfolio-notice";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-neutral-950 text-neutral-50">
      <PortfolioNotice />
      <AppHeader email={user.email ?? ""} />
      <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute top-0 left-0 h-[320px] w-full max-w-[320px] rounded-full bg-indigo-600/10 blur-[90px]" />
        <div className="relative z-10">{children}</div>
        <SiteFooter />
      </main>
    </div>
  );
}
