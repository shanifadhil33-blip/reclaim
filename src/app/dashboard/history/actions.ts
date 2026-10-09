"use server"

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function softDeleteAppeal(appealId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const adminClient = createAdminClient();
  
  const { error } = await adminClient
    .from("appeals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", appealId)
    .eq("user_id", user.id);

  if (error) console.error("[HISTORY] delete failed:", error.message);
  return { success: !error };
}

export async function clearAllHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const adminClient = createAdminClient();
  
  const { error } = await adminClient
    .from("appeals")
    .update({ deleted_at: new Date().toISOString() })
    .is("deleted_at", null)
    .eq("user_id", user.id);

  if (error) console.error("[HISTORY] clear failed:", error.message);
  return { success: !error };
}
