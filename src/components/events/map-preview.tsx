'use client'

import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Red marker icon for event location
const eventMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface MapPreviewProps {
  latitude: number
  longitude: number
  locationText?: string | null
  attendanceRadiusMeters?: number | null
}

export function MapPreview({ 
  latitude, 
  longitude, 
  locationText,
  attendanceRadiusMeters 
}: MapPreviewProps) {
  const center: [number, number] = [latitude, longitude]
  
  // Google Maps URL for directions
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`

  return (
    <div className="space-y-3">
      {/* Map Container */}
      <div className="h-[200px] w-full rounded-md overflow-hidden border border-input">
        <MapContainer 
          center={center} 
          zoom={16} 
          scrollWheelZoom={false} 
          dragging={true}
          zoomControl={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Event location marker */}
          <Marker position={center} icon={eventMarkerIcon}>
            <Popup>
              <div className="text-sm">
                {locationText && (
                  <p className="font-semibold">{locationText}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
          
          {/* Attendance radius circle */}
          {attendanceRadiusMeters && attendanceRadiusMeters > 0 && (
            <Circle
              center={center}
              radius={attendanceRadiusMeters}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 2,
              }}
            />
          )}
        </MapContainer>
      </div>
      
      {/* Open in Google Maps button */}
      <a 
        href={googleMapsUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-block"
      >
        <Button variant="outline" size="sm" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Open in Google Maps
        </Button>
      </a>
    </div>
  )
}
