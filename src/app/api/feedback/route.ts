import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId, message } = await request.json();

    if (!userId || !message?.trim()) {
      return NextResponse.json(
        { error: 'Missing userId or message.' },
        { status: 400 }
      );
    }

    // ── 1. Insert into Supabase ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabase.from('feedback').insert({
      user_id: userId,
      message: message.trim(),
    });

    if (dbError) {
      console.error('[FEEDBACK] DB insert failed:', dbError);
      return NextResponse.json(
        { error: dbError.message },
        { status: 500 }
      );
    }

    // ── 2. Fetch user email for context ──
    let userEmail = 'Unknown';
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    if (profile?.email) userEmail = profile.email;

    // ── 3. Send email notification ──
    const notifyEmail = process.env.FEEDBACK_NOTIFY_EMAIL;

    if (process.env.RESEND_API_KEY && notifyEmail) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Reclaim Feedback <onboarding@resend.dev>',
          to: notifyEmail,
          subject: `💬 New Feedback from ${userEmail}`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
              <h2 style="color: #111; margin-bottom: 4px;">New Feedback Received</h2>
              <p style="color: #666; font-size: 14px; margin-top: 0;">From <strong>${userEmail}</strong></p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; font-size: 15px; color: #333; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px;">User ID: ${userId}</p>
            </div>
          `,
        });
      } catch (emailErr) {
        // Log but don't fail — feedback was already saved
        console.error('[FEEDBACK] Email notification failed:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[FEEDBACK] Unexpected error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
