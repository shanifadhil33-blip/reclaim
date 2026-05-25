import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Polar } from '@polar-sh/sdk';

/**
 * POST /api/verify-subscription
 * 
 * Safety-net endpoint: queries Polar's API directly to verify
 * whether the current user has an active subscription, and syncs
 * the result to our database. This recovers from missed/corrupted
 * webhook events.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read current DB status first
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, polar_subscription_id')
      .eq('id', user.id)
      .single();

    // If already active in DB, no need to verify with Polar
    if (profile?.subscription_status === 'active') {
      return NextResponse.json({ status: 'active', source: 'database' });
    }

    // Check if POLAR_API_TOKEN is available
    const polarToken = process.env.POLAR_API_TOKEN;
    if (!polarToken) {
      console.warn('[VERIFY] No POLAR_API_TOKEN set — cannot verify with Polar API');
      return NextResponse.json({
        status: profile?.subscription_status || 'trial',
        source: 'database',
        warning: 'Polar API token not configured'
      });
    }

    // Query Polar to check if this user has an active subscription
    const polar = new Polar({ accessToken: polarToken });
    const adminSupabase = createAdminClient();

    let hasActiveSubscription = false;
    let foundSubscriptionId: string | null = null;

    // Strategy 1: If we have a polar_subscription_id, check that directly
    if (profile?.polar_subscription_id) {
      try {
        const sub = await polar.subscriptions.get({ id: profile.polar_subscription_id });
        if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
          hasActiveSubscription = true;
          foundSubscriptionId = sub.id;
          console.log(`[VERIFY] Polar subscription ${profile.polar_subscription_id} is ${sub.status}`);
        }
      } catch (e) {
        console.warn('[VERIFY] Could not fetch subscription by ID, falling back to email lookup');
      }
    }

    // Strategy 2: Look up by customer email
    if (!hasActiveSubscription && user.email) {
      try {
        const customersResult = await polar.customers.list({ email: user.email });
        for await (const page of customersResult) {
          const customers = page.result?.items || [];
          for (const customer of customers) {
            // Check active subscriptions for this customer
            const subsResult = await polar.subscriptions.list({
              customerId: customer.id,
              active: true,
            });
            for await (const subPage of subsResult) {
              const subs = subPage.result?.items || [];
              for (const sub of subs) {
                if (sub.status === 'active' || sub.status === 'trialing') {
                  hasActiveSubscription = true;
                  foundSubscriptionId = sub.id;
                  console.log(`[VERIFY] Found active subscription via email lookup: ${sub.id} (${sub.status})`);
                  break;
                }
              }
              if (hasActiveSubscription) break;
            }
            if (hasActiveSubscription) break;
          }
          if (hasActiveSubscription) break;
        }
      } catch (e) {
        console.error('[VERIFY] Error looking up customer by email:', e);
      }
    }

    if (hasActiveSubscription) {
      // Update DB to reflect the verified active status
      const updateData: Record<string, string> = { subscription_status: 'active' };
      if (foundSubscriptionId) {
        updateData.polar_subscription_id = foundSubscriptionId;
      }
      await adminSupabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      return NextResponse.json({ status: 'active', source: 'polar_api' });
    }

    // No active subscription found in Polar
    return NextResponse.json({
      status: profile?.subscription_status || 'trial',
      source: 'polar_api',
    });
  } catch (error) {
    console.error('[VERIFY] Error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
