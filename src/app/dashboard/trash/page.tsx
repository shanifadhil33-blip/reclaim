import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/back-link";
import TrashClient from "./TrashClient";
import { getTrashedAppeals } from "./actions";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/expired");
  }

  const { data: appeals, error } = await getTrashedAppeals();

  if (error) {
    console.error("[TRASH] Query failed:", {
      error,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <BackLink href="/dashboard/history" label="History" />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-2">Recycle Bin</h1>
          <p className="text-neutral-400">Deleted letters stay here until you restore them or permanently delete them. Nothing is removed on a timer.</p>
        </div>
      </div>
      
      <TrashClient initialAppeals={appeals || []} accountLoadFailed={Boolean(error)} />
    </div>
  );
}
