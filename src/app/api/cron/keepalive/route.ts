import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Exclude this route from static pre-rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { status: 'error', message: 'Supabase credentials are missing.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Run a lightweight query on the database to trigger activity and keep the Supabase project active
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[CRON KEEPALIVE] Supabase query failed:', error);
      return NextResponse.json(
        { status: 'error', message: 'Database query failed.', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      message: 'Database keep-alive ping executed successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[CRON KEEPALIVE] Unexpected error occurred:', err);
    return NextResponse.json(
      { status: 'error', message: 'Unexpected internal error.', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
