'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  MapPin,
  User,
  Plus,
  ArrowLeft,
  Clock,
  FileText,
  Timer,
} from 'lucide-react'
import { MembershipRole } from '@/types/membership'
import { getEventStatus, formatEventDate, formatEventTime } from '@/lib/utils'

interface Event {
  id: string
  event_name: string
  date: string
  event_start?: string | null
  event_end?: string | null
  location: string | null
  description: string | null
  created_by: string
  created_at: string
  users: {
    name: string
    email: string
  }
}

interface EventsListViewProps {
  organizationId: string
  organizationName: string
  userRole: MembershipRole
  events: Event[]
}

export function EventsListView({
  organizationId,
  organizationName,
  userRole,
  events,
}: EventsListViewProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'past'>('all')

  const canCreateEvents = ['Owner', 'Admin', 'Attendance Taker'].includes(userRole)

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true
    const status = getEventStatus(event)
    return status === filter
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const now = new Date()

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > now
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/organizations`)}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Events</h1>
            <p className="text-sm text-muted-foreground">{organizationName}</p>
          </div>
        </div>

        {canCreateEvents && (
          <Button
            onClick={() => router.push(`/organizations/${organizationId}/events/create`)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-card shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilter('ongoing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'ongoing'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              Currently Happening
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'upcoming'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'past'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              Past
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card className="bg-card shadow-md">
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No events found
              </h3>
              <p className="text-muted-foreground mb-6">
                {filter === 'ongoing'
                  ? 'No events currently happening.'
                  : filter === 'upcoming'
                  ? 'No upcoming events scheduled.'
                  : filter === 'past'
                  ? 'No past events.'
                  : 'No events have been created yet.'}
              </p>
              {canCreateEvents && filter === 'all' && (
                <Button
                  onClick={() =>
                    router.push(`/organizations/${organizationId}/events/create`)
                  }
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Event
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const eventStatus = getEventStatus(event)
            const hasAttendanceWindow = event.event_start && event.event_end
            
            return (
            <Card
              key={event.id}
              className={`bg-card shadow-md hover:shadow-lg transition-shadow cursor-pointer ${
                eventStatus === 'ongoing' ? 'border-l-4 border-l-green-500' : eventStatus === 'upcoming' ? 'border-l-4 border-l-primary' : ''
              }`}
              onClick={() => router.push(`/organizations/${organizationId}/events/${event.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Event Info */}
                  <div className="flex-1 space-y-3">
                    {/* Event Name & Status Badge */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {event.event_name}
                      </h3>
                      {eventStatus === 'ongoing' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Currently Happening
                        </span>
                      )}
                      {eventStatus === 'upcoming' && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                          Upcoming
                        </span>
                      )}
                      {eventStatus === 'past' && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-semibold rounded-full">
                          Past
                        </span>
                      )}
                    </div>

                    {/* Date and Time */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{formatEventDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{formatEventTime(event.date)}</span>
                      </div>
                    </div>

                    {/* Attendance Window */}
                    {hasAttendanceWindow && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/50 p-2 rounded-md">
                        <Timer className="h-4 w-4 text-primary" />
                        <span>
                          Attendance: {formatEventTime(event.event_start!)} - {formatEventTime(event.event_end!)}
                        </span>
                      </div>
                    )}

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{event.location}</span>
                      </div>
                    )}

                    {/* Description Preview */}
                    {event.description && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4 text-primary mt-0.5" />
                        <p className="line-clamp-2">{event.description}</p>
                      </div>
                    )}

                    {/* Creator */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                      <User className="h-3 w-3" />
                      <span>Created by {event.users.name}</span>
                    </div>
                  </div>

                  {/* Date Badge */}
                  <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-3 min-w-[70px]">
                    <span className="text-2xl font-bold text-primary">
                      {new Date(event.date).getDate()}
                    </span>
                    <span className="text-xs font-medium text-primary uppercase">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
          })}
        </div>
      )}
    </div>
  )
}
