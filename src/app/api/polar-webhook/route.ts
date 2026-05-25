import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';

/**
 * Map Polar's subscription status to our internal DB status.
 * Polar statuses: 'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid'
 * Our DB statuses: 'trial', 'active', 'canceled', 'past_due'
 */
function mapPolarStatus(polarStatus: string, cancelAtPeriodEnd?: boolean): string {
  // If user canceled but still has time left, keep them active
  if (cancelAtPeriodEnd && polarStatus === 'active') return 'active';

  switch (polarStatus) {
    case 'active':
    case 'trialing':  // Polar's trial on a paid subscription = active for us
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'revoked':
    case 'unpaid':
    case 'incomplete':
      return 'canceled';
    default:
      // Fail open — don't lock out paying users on unknown statuses
      console.warn(`[WEBHOOK] Unknown Polar status: "${polarStatus}" — defaulting to 'active'`);
      return 'active';
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    let payload: any;

    // Validate signature using Polar's official SDK (Standard Webhooks format)
    if (webhookSecret) {
      try {
        payload = validateEvent(
          rawBody,
          Object.fromEntries(req.headers.entries()),
          webhookSecret
        );
      } catch (error) {
        if (error instanceof WebhookVerificationError) {
          console.error('[WEBHOOK] Signature verification failed:', error.message);
          return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }
        throw error;
      }
    } else {
      console.warn('[WEBHOOK] No POLAR_WEBHOOK_SECRET set — skipping signature validation (NOT SAFE FOR PRODUCTION)');
      payload = JSON.parse(rawBody);
    }

    const eventType = payload.type;
    console.log(`[WEBHOOK] Received event: ${eventType}`);
    console.log(`[WEBHOOK] Full payload:`, JSON.stringify(payload, null, 2));

    const supabase = createAdminClient();

    // Handle subscription lifecycle events
    const handledEvents = [
      'subscription.created',
      'subscription.updated',
      'subscription.active',
      'subscription.revoked',
      'subscription.canceled',
    ];

    if (handledEvents.includes(eventType)) {
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
          console.log(`[WEBHOOK] Found user by email: ${userId}`);
        }
      }

      if (userId) {
        // For revoked events, always set to canceled
        const newStatus = eventType === 'subscription.revoked'
          ? 'canceled'
          : mapPolarStatus(subscription.status, subscription.cancel_at_period_end);

        console.log(`[WEBHOOK] Polar status: "${subscription.status}", cancel_at_period_end: ${subscription.cancel_at_period_end}, mapped to: "${newStatus}"`);
        console.log(`[WEBHOOK] Updating user ${userId} → subscription_status: ${newStatus}`);
        
        const { error, data } = await supabase
          .from('profiles')
          .update({
            subscription_status: newStatus,
            polar_subscription_id: subscription.id
          })
          .eq('id', userId)
          .select();

        if (error) {
          console.error('[WEBHOOK] Failed to update profile:', error.message);
          
          // If the profile doesn't exist yet, try to create it
          if (error.message.includes('0 rows')) {
            console.log('[WEBHOOK] Profile not found, attempting to create one...');
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                subscription_status: newStatus,
                polar_subscription_id: subscription.id,
                trial_ends_at: new Date().toISOString()
              });
            
            if (insertError) {
              console.error('[WEBHOOK] Failed to create profile:', insertError.message);
            } else {
              console.log(`[WEBHOOK] ✅ Created profile for user ${userId} with status ${newStatus}`);
            }
          }
        } else {
          console.log(`[WEBHOOK] ✅ User ${userId} updated to ${newStatus}. Updated rows:`, data?.length);
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

