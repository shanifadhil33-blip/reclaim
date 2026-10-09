"use server"

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getTrashedAppeals() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: null };

  const { data, error } = await supabase
    .from("appeals")
    .select("*")
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) console.error("[TRASH] list failed:", error.message);
  return { error: error ? "load-failed" : undefined, data };
}

export async function restoreAppeal(appealId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const adminClient = createAdminClient();
  
  const { error } = await adminClient
    .from("appeals")
    .update({ deleted_at: null })
    .eq("id", appealId)
    .eq("user_id", user.id);

  if (error) console.error("[TRASH] restore failed:", error.message);
  return { success: !error };
}

export async function permanentDeleteAppeal(appealId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const adminClient = createAdminClient();
  
  const { error } = await adminClient
    .from("appeals")
    .delete()
    .eq("id", appealId)
    .eq("user_id", user.id);

  if (error) console.error("[TRASH] delete failed:", error.message);
  return { success: !error };
}

export async function emptyTrash() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const adminClient = createAdminClient();
  
  const { error } = await adminClient
    .from("appeals")
    .delete()
    .not("deleted_at", "is", null)
    .eq("user_id", user.id);

  if (error) console.error("[TRASH] empty failed:", error.message);
  return { success: !error };
}
