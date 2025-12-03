import { cookies } from 'next/headers'

export type Theme = 'light' | 'dark'

const THEME_COOKIE_NAME = 'nfc-attendance-theme'

/**
 * Get the current theme from cookies (server-side)
 * @returns The current theme ('light' or 'dark')
 */
export async function getTheme(): Promise<Theme> {
  try {
    const cookieStore = await cookies()
    const theme = cookieStore.get(THEME_COOKIE_NAME)?.value as Theme | undefined
    return theme || 'light'
  } catch (error) {
    console.error('Error reading theme cookie:', error)
    return 'light'
  }
}

/**
 * Get theme from cookies synchronously (for middleware)
 * @param cookieHeader The cookie header string
 * @returns The current theme ('light' or 'dark')
 */
export function getThemeFromCookies(cookieHeader: string | null): Theme {
  if (!cookieHeader) return 'light'
  
  const cookies = cookieHeader.split(';').map(c => c.trim())
  const themeCookie = cookies.find(c => c.startsWith(`${THEME_COOKIE_NAME}=`))
  
  if (!themeCookie) return 'light'
  
  const theme = themeCookie.split('=')[1]
  return theme === 'dark' ? 'dark' : 'light'
}
