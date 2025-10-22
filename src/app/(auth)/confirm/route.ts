import { createClient } from '@/lib/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const _next = searchParams.get('next')
  const next = _next?.startsWith('/') ? _next : '/'

  const supabase = await createClient()

  // Handle OAuth callback (Google, etc.)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      redirect(next)
    } else {
      redirect(`/error?error=${error?.message}`)
    }
  }

  // Handle email verification/magic link
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next)
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/error?error=${error?.message}`)
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/error?error=No token hash, code, or type`)
}
