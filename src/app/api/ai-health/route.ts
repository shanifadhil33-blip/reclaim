import { NextResponse } from "next/server";
import { checkAiHealth } from "@/lib/ai-providers";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const all = new URL(req.url).searchParams.get("all") === "1";
  const providers = await checkAiHealth(process.env, { all });
  return NextResponse.json({ providers });
}
