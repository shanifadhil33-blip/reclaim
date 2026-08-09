import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const cookieJar: {
    name: string
    value: string
    options: CookieOptions
  }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, _headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookieJar.push(...cookiesToSet)
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')

  const response = NextResponse.redirect(new URL('/', request.url), {
    status: 302,
  })

  const latestByName = new Map<string, (typeof cookieJar)[number]>()
  for (const cookie of cookieJar) {
    latestByName.set(cookie.name, cookie)
  }
  latestByName.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
