'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Plus, ArrowRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Event } from '@/types/event'

interface EventsPreviewCardProps {
  organizationId: string
  canManageEvents: boolean
}

interface EventPreview extends Event {
  organization?: {
    id: string
    name: string
  }
}

export function EventsPreviewCard({ organizationId, canManageEvents }: EventsPreviewCardProps) {
  const router = useRouter()
  const [ongoingEvents, setOngoingEvents] = useState<EventPreview[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<EventPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const [ongoingRes, upcomingRes] = await Promise.all([
          fetch(`/api/event?organization_id=${organizationId}&ongoing=true&limit=3`),
          fetch(`/api/event?organization_id=${organizationId}&upcoming=true&limit=4`)
        ])

        let ongoingData: EventPreview[] = []
        if (ongoingRes.ok) {
          const data = await ongoingRes.json()
          // API returns array directly for ongoing/upcoming, or { events: [...] } for regular queries
          ongoingData = Array.isArray(data) ? data : (data.events || [])
          setOngoingEvents(ongoingData)
        }

        if (upcomingRes.ok) {
          const data = await upcomingRes.json()
          // API returns array directly for ongoing/upcoming, or { events: [...] } for regular queries
          const upcomingData = Array.isArray(data) ? data : (data.events || [])
          // Filter out any events that are already in ongoing
          const ongoingIds = new Set(ongoingData.map(e => e.id))
          setUpcomingEvents(upcomingData.filter((e: EventPreview) => !ongoingIds.has(e.id)))
        }
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [organizationId])

  const formatEventTime = (event: EventPreview) => {
    const date = new Date(event.date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const isToday = date.toDateString() === today.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()

    let dateStr = ''
    if (isToday) {
      dateStr = 'Today'
    } else if (isTomorrow) {
      dateStr = 'Tomorrow'
    } else {
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    if (event.event_start) {
      const startTime = new Date(event.event_start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      return `${dateStr} at ${startTime}`
    }

    return dateStr
  }

  const hasNoEvents = ongoingEvents.length === 0 && upcomingEvents.length === 0

  return (
    <Card className="bg-card shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Events
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/organizations/${organizationId}/events`)}
            className="text-primary hover:text-primary/80"
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : hasNoEvents ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm mb-4">No upcoming events</p>
            {canManageEvents && (
              <Button
                onClick={() => router.push(`/organizations/${organizationId}/events/create`)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Happening Now Section */}
            {ongoingEvents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                    Happening Now
                  </span>
                </div>
                <div className="space-y-2">
                  {ongoingEvents.map((event) => (
                    <EventPreviewItem
                      key={event.id}
                      event={event}
                      status="ongoing"
                      onClick={() => router.push(`/events/${event.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Section */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-2">
                {ongoingEvents.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Upcoming
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {upcomingEvents.slice(0, ongoingEvents.length > 0 ? 2 : 4).map((event) => (
                    <EventPreviewItem
                      key={event.id}
                      event={event}
                      status="upcoming"
                      onClick={() => router.push(`/events/${event.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Create Event Button for admins when there are events */}
            {canManageEvents && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/organizations/${organizationId}/events/create`)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface EventPreviewItemProps {
  event: EventPreview
  status: 'ongoing' | 'upcoming'
  onClick: () => void
}

function EventPreviewItem({ event, status, onClick }: EventPreviewItemProps) {
  const formatTime = () => {
    const date = new Date(event.date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const isToday = date.toDateString() === today.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()

    let dateStr = ''
    if (isToday) {
      dateStr = 'Today'
    } else if (isTomorrow) {
      dateStr = 'Tomorrow'
    } else {
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    if (event.event_start) {
      const startTime = new Date(event.event_start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      return `${dateStr}, ${startTime}`
    }

    return dateStr
  }

  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all duration-200 text-left group"
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className={`w-1 h-full min-h-[40px] rounded-full shrink-0 ${
          status === 'ongoing' 
            ? 'bg-green-500' 
            : 'bg-primary/50'
        }`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
              {event.event_name}
            </h4>
            {status === 'ongoing' && (
              <Badge variant="success" className="shrink-0 text-[10px] px-1.5 py-0">
                Live
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime()}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
