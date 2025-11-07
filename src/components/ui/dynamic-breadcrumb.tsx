'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

type BreadcrumbSegment = {
  label: string
  href?: string
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbSegment[]>([])

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean)
    const crumbs: BreadcrumbSegment[] = []

    // Build breadcrumbs based on the path
    let currentPath = ''
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      currentPath += `/${segment}`
      
      // Skip 'authenticated' route group
      if (segment === '(authenticated)') continue

      // Map segment to readable labels
      let label = segment
      let href = currentPath

      // Special cases for common routes
      switch (segment) {
        case 'dashboard':
          label = 'Dashboard'
          break
        case 'organizations':
          label = 'Organizations'
          break
        case 'user':
          label = 'Profile'
          break
        case 'complete-profile':
          label = 'Complete Profile'
          break
        case 'create':
          label = 'Create'
          break
        case 'search':
          label = 'Search'
          break
        case 'events':
          label = 'Events'
          break
        case 'members':
          label = 'Members'
          break
        case 'requests':
          label = 'Join Requests'
          break
        case 'settings':
          label = 'Settings'
          break
        default:
          // Check if it's a UUID (organization/event ID)
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
            // Try to fetch organization name from previous context
            const prevSegment = segments[i - 1]
            if (prevSegment === 'organizations') {
              label = 'Organization Details'
              // You could fetch the actual organization name here if needed
            } else if (prevSegment === 'events') {
              label = 'Event Details'
            }
          } else {
            // Capitalize first letter and replace hyphens with spaces
            label = segment
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
          }
      }

      // Don't add href to the last segment (current page)
      if (i === segments.length - 1) {
        crumbs.push({ label })
      } else {
        crumbs.push({ label, href })
      }
    }

    setBreadcrumbs(crumbs)
  }, [pathname])

  // Don't render if on root or only one segment
  if (breadcrumbs.length === 0) {
    return <h1 className="text-lg font-semibold">NFC Attendance System</h1>
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
