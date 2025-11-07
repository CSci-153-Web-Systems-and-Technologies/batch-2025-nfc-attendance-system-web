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
} from 'lucide-react'
import { MembershipRole } from '@/types/membership'

interface Event {
  id: string
  event_name: string
  date: string
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
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  const canCreateEvents = ['Owner', 'Admin', 'Attendance Taker'].includes(userRole)

  const now = new Date()

  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.date)
    if (filter === 'upcoming') {
      return eventDate > now
    } else if (filter === 'past') {
      return eventDate <= now
    }
    return true
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
            <h1 className="text-2xl font-bold text-gray-800">Events</h1>
            <p className="text-sm text-gray-600">{organizationName}</p>
          </div>
        </div>

        {canCreateEvents && (
          <Button
            onClick={() => router.push(`/organizations/${organizationId}/events/create`)}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'upcoming'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'past'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Past
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card className="bg-white shadow-md">
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                No events found
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'upcoming'
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
                  className="bg-violet-600 hover:bg-violet-700 text-white"
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
          {filteredEvents.map((event) => (
            <Card
              key={event.id}
              className={`bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer ${
                isUpcoming(event.date) ? 'border-l-4 border-l-violet-500' : ''
              }`}
              onClick={() => router.push(`/organizations/${organizationId}/events/${event.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Event Info */}
                  <div className="flex-1 space-y-3">
                    {/* Event Name & Status Badge */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {event.event_name}
                      </h3>
                      {isUpcoming(event.date) ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Upcoming
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                          Past
                        </span>
                      )}
                    </div>

                    {/* Date and Time */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-violet-600" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-violet-600" />
                        <span>{formatTime(event.date)}</span>
                      </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-violet-600" />
                        <span>{event.location}</span>
                      </div>
                    )}

                    {/* Description Preview */}
                    {event.description && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4 text-violet-600 mt-0.5" />
                        <p className="line-clamp-2">{event.description}</p>
                      </div>
                    )}

                    {/* Creator */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <User className="h-3 w-3" />
                      <span>Created by {event.users.name}</span>
                    </div>
                  </div>

                  {/* Date Badge */}
                  <div className="flex flex-col items-center justify-center bg-violet-50 rounded-lg p-3 min-w-[70px]">
                    <span className="text-2xl font-bold text-violet-600">
                      {new Date(event.date).getDate()}
                    </span>
                    <span className="text-xs font-medium text-violet-600 uppercase">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
