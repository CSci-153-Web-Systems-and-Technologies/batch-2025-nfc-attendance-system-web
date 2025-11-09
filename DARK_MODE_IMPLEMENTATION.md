# Dark Mode Backend Implementation

This branch implements the backend infrastructure for dark mode support in the NFC Attendance System.

## What's Included

### API Route: `/api/theme`

**GET** - Get the current theme preference
```typescript
Response: { theme: 'light' | 'dark' }
```

**POST** - Set the theme preference
```typescript
Request: { theme: 'light' | 'dark' }
Response: { theme: 'light' | 'dark', success: true }
```

The theme is stored in a cookie (`nfc-attendance-theme`) that persists for 1 year.

### Server Utilities (`src/lib/theme.ts`)

```typescript
import { getTheme, getThemeFromCookies } from '@/lib/theme'

// Get theme in Server Components
const theme = await getTheme() // Returns 'light' | 'dark'

// Get theme in middleware (synchronous)
const theme = getThemeFromCookies(request.headers.get('cookie'))
```

### Client Utilities (`src/lib/theme-client.ts`)

```typescript
'use client'
import { getTheme, setTheme, toggleTheme, initializeTheme, applyTheme } from '@/lib/theme-client'

// Initialize theme on app load (call in useEffect)
initializeTheme()

// Get current theme
const currentTheme = getTheme() // Returns 'light' | 'dark'

// Set theme
await setTheme('dark')

// Toggle theme
const newTheme = await toggleTheme()

// Apply theme without API call (for optimistic UI)
applyTheme('dark')
```

## UI Implementation (To Be Done on `feature/responsive-navigation`)

### 1. Create Theme Toggle Component

Create a theme toggle button/switch component on the responsive navigation branch:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { getTheme, toggleTheme } from '@/lib/theme-client'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Initialize theme on mount
    const currentTheme = getTheme()
    setTheme(currentTheme)
  }, [])

  const handleToggle = async () => {
    const newTheme = await toggleTheme()
    setTheme(newTheme)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  )
}
```

### 2. Add to Navigation

Add the `<ThemeToggle />` component to your navigation bar (top nav, sidebar, or mobile menu).

### 3. Initialize Theme in Root Layout

In `src/app/layout.tsx`, add theme initialization:

```tsx
import { getTheme } from '@/lib/theme'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const theme = await getTheme()
  
  return (
    <html lang="en" className={theme}>
      <body>{children}</body>
    </html>
  )
}
```

### 4. Add Client-Side Theme Initializer

Create `src/components/theme-initializer.tsx`:

```tsx
'use client'
import { useEffect } from 'react'
import { initializeTheme } from '@/lib/theme-client'

export function ThemeInitializer() {
  useEffect(() => {
    initializeTheme()
  }, [])

  return null
}
```

Add it to your root layout:

```tsx
import { ThemeInitializer } from '@/components/theme-initializer'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeInitializer />
        {children}
      </body>
    </html>
  )
}
```

## How It Works

1. **Cookie Storage**: Theme preference is stored in a cookie that persists across sessions
2. **Server-Side Rendering**: The theme is read from cookies on the server and applied to the `<html>` tag
3. **Client-Side Hydration**: The theme initializer ensures the client and server stay in sync
4. **API Persistence**: When users toggle the theme, it's saved via the `/api/theme` endpoint

## CSS Variables

Your CSS already has dark mode support via the `.dark` class. The theme system will automatically apply this class to the `<html>` element when dark mode is active.

Example from `globals.css`:
```css
:root {
  --primary: oklch(0.525 0.224 293); /* violet-600 */
  /* ... other light theme colors */
}

.dark {
  --primary: oklch(0.7 0.2 293); /* lighter violet for dark mode */
  /* ... other dark theme colors */
}
```

## Future Enhancements

- **Database Persistence**: Add a `theme_preference` column to the `users` table for authenticated users
- **System Preference**: Detect and respect `prefers-color-scheme` media query
- **Transition Animations**: Add smooth transitions when toggling themes

## Testing

The API endpoints are available at:
- GET http://localhost:3000/api/theme
- POST http://localhost:3000/api/theme

Test with curl:
```bash
# Get current theme
curl http://localhost:3000/api/theme

# Set theme to dark
curl -X POST http://localhost:3000/api/theme \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark"}'
```

## Branch Strategy

- **Current Branch**: `feature/theme/dark-mode-toggle` (backend only)
- **UI Branch**: `feature/responsive-navigation` (add ThemeToggle component here)
- **Merge Order**: Both branches should be merged to `develop` independently
