import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Supabase credentials are not configured.',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const latencyMs = Date.now() - start;

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          database: 'unreachable',
          message: error.message,
          latencyMs,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: 'healthy',
        database: 'connected',
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
        message,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
