'use client'

import { useEffect } from 'react'
import { AuthenticatedNav } from '@/components/ui/authenticated-nav'

export function AuthenticatedWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Hide unauthenticated sidebar for authenticated pages
    const style = document.createElement('style')
    style.id = 'hide-unauth-sidebar'
    style.innerHTML = `
      body > div > aside:first-of-type {
        display: none !important;
      }
      @media (min-width: 768px) {
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
      const styleEl = document.getElementById('hide-unauth-sidebar')
      if (styleEl) {
        styleEl.remove()
      }
    }
  }, [])

  return (
    <>
      <AuthenticatedNav />
      <div className="md:ml-16 pt-16 md:pt-0">
        {children}
      </div>
    </>
  )
}
