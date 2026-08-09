import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextPath = searchParams.get('next')?.startsWith('/')
    ? searchParams.get('next')!
    : '/dashboard'

  const providerError = searchParams.get('error')
  const providerErrorDescription = searchParams.get('error_description')
  if (providerError) {
    const errMsg = `OAuth Callback Redirect Error: ${providerError} - ${providerErrorDescription}`
    console.error(errMsg)
    Sentry.captureMessage(errMsg, 'error')
    const message = providerErrorDescription || providerError
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Missing auth code')}`
    )
  }

  // Collect auth cookies here so branching redirects still receive Set-Cookie.
  const cookieJar: CookieToSet[] = []
  const headerJar: Record<string, string> = {}

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookieJar.push(...cookiesToSet)
          Object.assign(headerJar, headers)
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('OAuth Code Exchange Error:', error)
    Sentry.captureException(error)
    return applyCookies(
      NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message || 'Invalid auth code')}`
      ),
      cookieJar,
      headerJar
    )
  }

  let redirectTo = `${origin}${nextPath}`

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const deviceFp = request.cookies.get('device_fp')?.value

    if (deviceFp) {
      const { count } = await supabase
        .from('device_fingerprints')
        .select('*', { count: 'exact', head: true })
        .eq('fingerprint', deviceFp)
        .neq('user_id', user.id)

      if (count && count >= 1) {
        const { data: existingRecord } = await supabase
          .from('device_fingerprints')
          .select('id')
          .eq('fingerprint', deviceFp)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!existingRecord) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', user.id)
            .maybeSingle()

          if (!profile || profile.subscription_status !== 'active') {
            await supabase.auth.signOut()
            redirectTo = `${origin}/login?error=device_limit`
            const response = applyCookies(
              NextResponse.redirect(redirectTo),
              cookieJar,
              headerJar
            )
            response.cookies.set('device_fp', '', { path: '/', maxAge: 0 })
            return response
          }
        }
      }

      await supabase.from('device_fingerprints').upsert(
        {
          user_id: user.id,
          fingerprint: deviceFp,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,fingerprint' }
      )

      const response = applyCookies(NextResponse.redirect(redirectTo), cookieJar, headerJar)
      response.cookies.set('device_fp', '', { path: '/', maxAge: 0 })
      return response
    }
  }

  return applyCookies(NextResponse.redirect(redirectTo), cookieJar, headerJar)
}

function applyCookies(
  response: NextResponse,
  cookieJar: CookieToSet[],
  headerJar: Record<string, string>
) {
  // Last write wins for duplicate cookie names (e.g. signOut after exchange).
  const latestByName = new Map<string, CookieToSet>()
  for (const cookie of cookieJar) {
    latestByName.set(cookie.name, cookie)
  }

  latestByName.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  Object.entries(headerJar).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}
