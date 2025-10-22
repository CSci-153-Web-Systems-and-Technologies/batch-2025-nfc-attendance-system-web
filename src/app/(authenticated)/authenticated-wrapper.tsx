'use client'

import { useEffect } from 'react'

export function AuthenticatedWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Hide sidebar for authenticated pages
    const style = document.createElement('style')
    style.id = 'hide-sidebar'
    style.innerHTML = `
      @media (min-width: 768px) {
        body > div > aside {
          display: none !important;
        }
        body > div > main {
          margin-left: 0 !important;
        }
      }
      @media (max-width: 767px) {
        body > div > main {
          padding-top: 0 !important;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      // Cleanup on unmount
      const styleEl = document.getElementById('hide-sidebar')
      if (styleEl) {
        styleEl.remove()
      }
    }
  }, [])

  return <>{children}</>
}
