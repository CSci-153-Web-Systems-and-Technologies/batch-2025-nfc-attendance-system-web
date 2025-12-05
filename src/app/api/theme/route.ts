import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const THEME_COOKIE_NAME = 'nfc-attendance-theme'
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const theme = cookieStore.get(THEME_COOKIE_NAME)?.value || 'light'

    return NextResponse.json({ theme }, { status: 200 })
  } catch (error) {
    console.error('Error getting theme:', error)
    return NextResponse.json(
      { error: 'Failed to get theme preference' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { theme } = body

    // Validate theme value
    if (theme !== 'light' && theme !== 'dark') {
      return NextResponse.json(
        { error: 'Invalid theme. Must be "light" or "dark"' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    
    // Set the theme cookie
    cookieStore.set(THEME_COOKIE_NAME, theme, {
      httpOnly: false, // Allow client-side access for theme toggle
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: THEME_COOKIE_MAX_AGE,
      path: '/',
    })

    return NextResponse.json({ theme, success: true }, { status: 200 })
  } catch (error) {
    console.error('Error setting theme:', error)
    return NextResponse.json(
      { error: 'Failed to set theme preference' },
      { status: 500 }
    )
  }
}
