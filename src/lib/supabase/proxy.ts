import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { decideAuthRedirect } from '@/lib/auth-redirect'

const STAY_HOME = 'reclaim_stay_home'

function copySetCookies(from: NextResponse, to: NextResponse) {
  for (const header of from.headers.getSetCookie()) {
    to.headers.append('set-cookie', header)
  }
}

function clearAuthCookies(response: NextResponse, request: NextRequest) {
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith('sb-')) {
      response.cookies.set(name, '', { path: '/', maxAge: 0 })
    }
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // Signed in only after the Auth server accepts the session.
  // A leftover sb-* cookie is not enough.
  let hasUser = false
  try {
    const { data, error } = await supabase.auth.getUser()
    hasUser = Boolean(data.user) && !error
  } catch {
    hasUser = false
  }

  const hadAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'))
  const clearInvalid = !hasUser && hadAuthCookie
  if (clearInvalid) {
    clearAuthCookies(supabaseResponse, request)
  }

  const pathname = request.nextUrl.pathname
  const decision = decideAuthRedirect({
    pathname,
    hasUser,
    stayHome: request.cookies.get(STAY_HOME)?.value === '1',
  })

  if (decision.action === 'next') {
    if (pathname === '/' && request.cookies.get(STAY_HOME)) {
      supabaseResponse.cookies.set(STAY_HOME, '', { path: '/', maxAge: 0 })
    }
    return supabaseResponse
  }

  const url = request.nextUrl.clone()
  url.pathname = decision.pathname
  url.search = decision.search
  const redirectResponse = NextResponse.redirect(url)
  copySetCookies(supabaseResponse, redirectResponse)
  if (clearInvalid) {
    clearAuthCookies(redirectResponse, request)
  }
  if (decision.stayHome) {
    redirectResponse.cookies.set(STAY_HOME, '1', {
      path: '/',
      maxAge: 60,
      httpOnly: true,
      sameSite: 'lax',
    })
  }
  return redirectResponse
}
