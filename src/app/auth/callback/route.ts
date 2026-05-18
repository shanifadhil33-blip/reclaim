import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Read device fingerprint from cookie
        const cookieStore = await cookies()
        const deviceFp = cookieStore.get('device_fp')?.value

        if (deviceFp) {
          // Check how many FREE accounts are using this device
          const { count } = await supabase
            .from('device_fingerprints')
            .select('*', { count: 'exact', head: true })
            .eq('fingerprint', deviceFp)
            .neq('user_id', user.id)

          // If another free account already exists on this device, block
          if (count && count >= 1) {
            // Check if THIS user is the one who originally registered on this device
            const { data: existingRecord } = await supabase
              .from('device_fingerprints')
              .select('id')
              .eq('fingerprint', deviceFp)
              .eq('user_id', user.id)
              .single()

            if (!existingRecord) {
              // This is a NEW user on a device that already has a free account
              // Check if this new user is a Pro subscriber (Pro users bypass the limit)
              const { data: profile } = await supabase
                .from('profiles')
                .select('subscription_tier')
                .eq('id', user.id)
                .single()

              if (!profile || profile.subscription_tier !== 'pro') {
                // Sign them out and redirect to the blocked page
                await supabase.auth.signOut()
                return NextResponse.redirect(
                  `${origin}/login?error=device_limit`
                )
              }
            }
          }

          // Upsert the device fingerprint record
          await supabase
            .from('device_fingerprints')
            .upsert(
              {
                user_id: user.id,
                fingerprint: deviceFp,
                last_seen_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,fingerprint' }
            )

          // Clear the fingerprint cookie
          cookieStore.set('device_fp', '', { path: '/', maxAge: 0 })
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid+Auth+Code`)
}
