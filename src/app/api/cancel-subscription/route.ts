import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Polar } from '@polar-sh/sdk';

/**
 * POST /api/cancel-subscription
 * 
 * Cancels the current user's subscription at the end of the billing period.
 * The user retains access until the period ends.
 * 
 * Body (optional):
 *   - reason: string (cancellation reason code)
 *   - comment: string (free-form cancellation comment)
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const polarToken = process.env.POLAR_API_TOKEN;
    if (!polarToken) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Get the user's subscription ID from DB
    const { data: profile } = await supabase
      .from('profiles')
      .select('polar_subscription_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (!profile?.polar_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Parse optional body for cancellation reason
    let reason: string | undefined;
    let comment: string | undefined;
    try {
      const body = await req.json();
      reason = body.reason;
      comment = body.comment;
    } catch {
      // No body — that's fine
    }

    const polar = new Polar({ accessToken: polarToken });

    // Cancel at period end — user keeps access until their current period expires
    const updatedSub = await polar.subscriptions.update({
      id: profile.polar_subscription_id,
      subscriptionUpdate: {
        cancelAtPeriodEnd: true,
        ...(reason && { customerCancellationReason: reason as any }),
        ...(comment && { customerCancellationComment: comment }),
      },
    });

    // Update local DB to reflect the cancellation is pending
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from('profiles')
      .update({ subscription_status: 'active' }) // Still active until period ends
      .eq('id', user.id);

    console.log(`[CANCEL] User ${user.id} scheduled cancellation for subscription ${profile.polar_subscription_id}`);

    return NextResponse.json({
      success: true,
      cancelAtPeriodEnd: updatedSub.cancelAtPeriodEnd,
      currentPeriodEnd: updatedSub.currentPeriodEnd,
      status: updatedSub.status,
    });
  } catch (error: any) {
    console.error('[CANCEL] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
