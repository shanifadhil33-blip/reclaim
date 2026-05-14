import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import TrashClient from "./TrashClient";
import { getTrashedAppeals } from "./actions";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appeals, error } = await getTrashedAppeals();

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-6 group">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-2">Recycle Bin</h1>
          <p className="text-neutral-400">Items here will be permanently deleted after 30 days.</p>
        </div>
      </div>
      
      <TrashClient initialAppeals={appeals || []} />
    </div>
  );
}
