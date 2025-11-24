'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useState } from 'react'
import L from 'leaflet'

// Simple default marker icon fix for Leaflet in Next.js bundling
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface MapPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
}

function LocationMarker({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null)
  useMapEvents({
    click(e) {
      setPosition(e.latlng)
      onChange(e.latlng.lat, e.latlng.lng)
    }
    // Could add move or drag events if needed
  })
  return position ? <Marker position={position} icon={markerIcon} /> : null
}

export function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const center: [number, number] = [latitude ?? 14.5995, longitude ?? 120.9842] // Default Manila

  return (
    <div className="h-64 w-full rounded-md overflow-hidden border border-input">
      <MapContainer center={center} zoom={15} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {latitude != null && longitude != null && (
          <Marker position={[latitude, longitude]} icon={markerIcon} />
        )}
        <LocationMarker onChange={onChange} />
      </MapContainer>
    </div>
  )
}
