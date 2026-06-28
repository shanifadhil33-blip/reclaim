import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Polar } from '@polar-sh/sdk';

/**
 * POST /api/customer-portal
 * 
 * Creates a Polar customer portal session for the authenticated user.
 * Returns a URL that redirects the user to Polar's hosted portal where
 * they can manage payment methods, view invoices, and update billing info.
 */
export async function POST() {
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

    if (!user.email) {
      return NextResponse.json(
        { error: 'No email associated with this account' },
        { status: 400 }
      );
    }

    const polar = new Polar({ accessToken: polarToken });

    // Find the Polar customer by email
    let polarCustomerId: string | null = null;

    try {
      const customersResult = await polar.customers.list({ email: user.email });
      for await (const page of customersResult) {
        const customers = page.result?.items || [];
        if (customers.length > 0) {
          polarCustomerId = customers[0].id;
          break;
        }
      }
    } catch (e) {
      console.error('[PORTAL] Error looking up customer:', e);
    }

    if (!polarCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe first.' },
        { status: 404 }
      );
    }

    // Create a customer portal session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await polar.customerSessions.create({
      customerId: polarCustomerId,
      returnUrl: `${appUrl}/dashboard/billing`,
    });

    console.log(`[PORTAL] Created customer portal session for user ${user.id} (customer ${polarCustomerId})`);

    return NextResponse.json({
      portalUrl: session.customerPortalUrl,
    });
  } catch (error: any) {
    console.error('[PORTAL] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
