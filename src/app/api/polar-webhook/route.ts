import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHmac } from 'crypto';

// Verify Polar webhook signature
function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return signature === expected || signature === `sha256=${expected}`;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    // Validate signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('x-polar-signature') || req.headers.get('webhook-signature');
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.error('[WEBHOOK] Invalid signature — rejecting');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('[WEBHOOK] No POLAR_WEBHOOK_SECRET set — skipping signature validation (NOT SAFE FOR PRODUCTION)');
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type;
    console.log(`[WEBHOOK] Received event: ${eventType}`);

    const supabase = createAdminClient();

    if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
      const subscription = payload.data;
      
      // Try user_id from metadata first
      let userId = subscription.metadata?.user_id;

      // Fallback: look up user by email if metadata is missing
      if (!userId && subscription.customer?.email) {
        console.log(`[WEBHOOK] No user_id in metadata, looking up by email: ${subscription.customer.email}`);
        const { data: listData } = await supabase.auth.admin.listUsers();
        const matchedUser = listData?.users?.find((u: any) => u.email === subscription.customer.email);
        if (matchedUser) {
          userId = matchedUser.id;
        }
      }

      if (userId) {
        const newStatus = subscription.status === 'active' ? 'active' : 'trial';
        console.log(`[WEBHOOK] Updating user ${userId} → subscription_status: ${newStatus}`);
        
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: newStatus,
            polar_subscription_id: subscription.id
          })
          .eq('id', userId);

        if (error) {
          console.error('[WEBHOOK] Failed to update profile:', error.message);
        } else {
          console.log(`[WEBHOOK] ✅ User ${userId} upgraded to ${newStatus}`);
        }
      } else {
        console.error('[WEBHOOK] Could not identify user — no metadata.user_id and no customer email match');
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
