'use client'

export type Theme = 'light' | 'dark'

const THEME_COOKIE_NAME = 'nfc-attendance-theme'

/**
 * Get the current theme from cookies (client-side)
 * @returns The current theme ('light' or 'dark')
 */
export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  
  const cookies = document.cookie.split(';').map(c => c.trim())
  const themeCookie = cookies.find(c => c.startsWith(`${THEME_COOKIE_NAME}=`))
  
  if (!themeCookie) return 'light'
  
  const theme = themeCookie.split('=')[1]
  return theme === 'dark' ? 'dark' : 'light'
}

/**
 * Set the theme via API and update cookie (client-side)
 * @param theme The theme to set ('light' or 'dark')
 * @returns Promise resolving to success status
 */
export async function setTheme(theme: Theme): Promise<boolean> {
  try {
    const response = await fetch('/api/theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ theme }),
    })

    if (!response.ok) {
      throw new Error('Failed to set theme')
    }

    // Apply theme class to document
    applyTheme(theme)

    return true
  } catch (error) {
    console.error('Error setting theme:', error)
    return false
  }
}

/**
 * Apply theme class to the document element
 * @param theme The theme to apply
 */
export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

/**
 * Toggle between light and dark theme
 * @returns Promise resolving to the new theme
 */
export async function toggleTheme(): Promise<Theme> {
  const currentTheme = getTheme()
  const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light'
  
  await setTheme(newTheme)
  
  return newTheme
}

/**
 * Initialize theme on page load
 * Call this in a useEffect or at the top level of your app
 */
export function initializeTheme() {
  const theme = getTheme()
  applyTheme(theme)
}
