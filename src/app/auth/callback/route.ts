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
    return NextResponse.redirect(`${origin}/login?error=sign-in`)
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
        `${origin}/login?error=sign-in`
      ),
      cookieJar,
      headerJar
    )
  }

  return applyCookies(NextResponse.redirect(`${origin}${nextPath}`), cookieJar, headerJar)
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
