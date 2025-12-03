'use client'

import dynamic from 'next/dynamic'

// Dynamic import for MapPreview to avoid SSR issues with Leaflet
const MapPreview = dynamic(
  () => import('@/components/events/map-preview').then(mod => ({ default: mod.MapPreview })),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-[200px] w-full bg-muted animate-pulse rounded-md" />
    )
  }
)

interface MapPreviewWrapperProps {
  latitude: number
  longitude: number
  locationText?: string | null
  attendanceRadiusMeters?: number | null
}

export function MapPreviewWrapper(props: MapPreviewWrapperProps) {
  return <MapPreview {...props} />
}
