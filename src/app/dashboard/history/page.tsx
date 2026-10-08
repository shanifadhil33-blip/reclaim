import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { ClearAllAppealsButton } from "./HistoryActions";
import HistoryTableClient from "./HistoryTableClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appeals, error } = await supabase
    .from("appeals")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[HISTORY] Supabase query failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-200 pb-12">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <BackLink href="/dashboard" label="Worklist" />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-2">History</h1>
          <p className="text-neutral-400">Letters saved to this account. Deleted ones sit in the recycle bin.</p>
          <Link href="/dashboard/trash" className="mt-3 inline-flex h-11 items-center text-sm text-indigo-300 hover:text-indigo-200">
            Recycle bin
          </Link>
        </div>
        {appeals && appeals.length > 0 && <ClearAllAppealsButton />}
      </div>
      
      <Suspense fallback={<div className="h-40 rounded-2xl bg-white/5" />}>
        <HistoryTableClient initialAppeals={appeals || []} />
      </Suspense>
    </div>
  );
}
