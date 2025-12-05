'use client'

import { MapContainer, TileLayer, Marker, useMapEvents, Popup, useMap, Tooltip } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import { useState, useEffect } from 'react'
import L from 'leaflet'
import { getHistoricalLocations, getBestLocationFromCluster, type LocationSuggestion } from '@/lib/services/location-autocomplete'

// Red marker icon for current selection
const currentMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Blue marker icon for historical locations
const historicalMarkerIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
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
  organizationId?: string
  onLocationSelect?: (location: string, lat: number, lng: number) => void
  searchKeyword?: string
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
  return position ? <Marker position={position} icon={currentMarkerIcon} /> : null
}

interface HistoricalMarkersProps {
  organizationId: string
  onHistoricalLocationClick: (location: LocationSuggestion) => void
  currentLat: number | null
  currentLng: number | null
}

function HistoricalMarkers({ 
  organizationId, 
  onHistoricalLocationClick,
  currentLat,
  currentLng
}: HistoricalMarkersProps) {
  const [locations, setLocations] = useState<LocationSuggestion[]>([])

  useEffect(() => {
    const fetchLocations = async () => {
      const historical = await getHistoricalLocations(organizationId)
      // Filter out current location to avoid duplicate markers
      const filtered = historical.filter(loc => {
        if (currentLat === null || currentLng === null) return true
        // Consider locations different if they're more than 5 meters apart
        const distance = Math.sqrt(
          Math.pow(loc.latitude - currentLat, 2) + 
          Math.pow(loc.longitude - currentLng, 2)
        ) * 111320 // Rough conversion to meters
        return distance > 5
      })
      setLocations(filtered)
    }

    fetchLocations()
  }, [organizationId, currentLat, currentLng])

  return (
    <MarkerClusterGroup
      chunkedLoading
      showCoverageOnHover={false}
      maxClusterRadius={50}
    >
      {locations.map((loc, index) => (
        <Marker
          key={`${loc.location}-${loc.latitude}-${loc.longitude}-${index}`}
          position={[loc.latitude, loc.longitude]}
          icon={historicalMarkerIcon}
          eventHandlers={{
            click: () => onHistoricalLocationClick(loc)
          }}
        >
          <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
            <div className="text-xs font-medium">
              {loc.location}
            </div>
          </Tooltip>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{loc.location}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Used {loc.usage_count} time{loc.usage_count !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-blue-600 mt-1">Click to use this location</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  )
}

// Component to update map center when coordinates change
function MapUpdater({ latitude, longitude }: { latitude: number | null, longitude: number | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      map.setView([latitude, longitude], 15, {
        animate: true,
        duration: 0.5
      })
    }
  }, [latitude, longitude, map])
  
  return null
}

export function MapPicker({ 
  latitude, 
  longitude, 
  onChange,
  organizationId,
  onLocationSelect,
  searchKeyword
}: MapPickerProps) {
  const center: [number, number] = [latitude ?? 14.5995, longitude ?? 120.9842] // Default Manila

  const handleHistoricalLocationClick = (location: LocationSuggestion) => {
    // Update coordinates
    onChange(location.latitude, location.longitude)
    
    // Notify parent component about the location selection
    if (onLocationSelect) {
      onLocationSelect(location.location, location.latitude, location.longitude)
    }
  }

  return (
    <div className="h-64 w-full rounded-md overflow-hidden border border-input">
      <MapContainer center={center} zoom={15} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Update map center when coordinates change */}
        <MapUpdater latitude={latitude} longitude={longitude} />
        
        {/* Historical location markers with clustering */}
        {organizationId && (
          <HistoricalMarkers 
            organizationId={organizationId}
            onHistoricalLocationClick={handleHistoricalLocationClick}
            currentLat={latitude}
            currentLng={longitude}
          />
        )}
        
        {/* Current selection marker (red) */}
        {latitude != null && longitude != null && (
          <Marker position={[latitude, longitude]} icon={currentMarkerIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Current Selection</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Click handler for new locations */}
        <LocationMarker onChange={onChange} />
      </MapContainer>
    </div>
  )
}
