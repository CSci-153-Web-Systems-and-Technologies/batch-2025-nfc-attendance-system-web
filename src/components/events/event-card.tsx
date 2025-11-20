'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Building2, Calendar, Clock, FileText, MapPin, Timer, User } from 'lucide-react'
import { formatEventDate, formatEventTime } from '@/lib/utils'

type EventStatus = 'ongoing' | 'upcoming' | 'past'

interface EventCardProps {
  event: {
    id: string
    event_name: string
    date: string
    location: string | null
    description: string | null
    event_start?: string | null
    event_end?: string | null
    organization?: {
      id: string
      name: string
    }
    users?: {
      name: string
      email?: string
    }
    created_by_user?: {
      name: string
      email?: string
    }
  }
  status: EventStatus
  onClick?: () => void
  showOrganization?: boolean
  showCreator?: boolean
}

export function EventCard({ event, status, onClick, showOrganization = false, showCreator = false }: EventCardProps) {
  const statusConfig = {
    ongoing: {
      label: 'Currently Happening',
      badgeClass: 'bg-green-100 text-green-700',
      borderClass: 'border-l-4 border-l-green-500',
      dateBoxClass: 'bg-violet-50',
      dateTextClass: 'text-violet-600',
    },
    upcoming: {
      label: 'Upcoming',
      badgeClass: 'bg-green-100 text-green-700',
      borderClass: 'border-l-4 border-l-violet-500',
      dateBoxClass: 'bg-violet-50',
      dateTextClass: 'text-violet-600',
    },
    past: {
      label: 'Past',
      badgeClass: 'bg-gray-100 text-gray-600',
      borderClass: '',
      dateBoxClass: 'bg-violet-50',
      dateTextClass: 'text-violet-600',
    },
  }

  const config = statusConfig[status]
  
  // Get creator info from either users or created_by_user field
  const creator = event.users || event.created_by_user
  
  // Check if event has attendance window
  const hasAttendanceWindow = event.event_start && event.event_end
  
  return (
    <Card
      className={`bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer ${config.borderClass}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Event Info */}
          <div className="flex-1 space-y-3">
            {/* Event Name & Status Badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-800">
                {event.event_name}
              </h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.badgeClass}`}>
                {config.label}
              </span>
            </div>

            {/* Organization */}
            {showOrganization && event.organization && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4 text-violet-600" />
                <span>{event.organization.name}</span>
              </div>
            )}

            {/* Date and Time */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-violet-600" />
              <span>{formatEventDate(event.date)}</span>
              <Clock className="h-4 w-4 text-violet-600 ml-2" />
              <span>{formatEventTime(event.date)}</span>
            </div>

            {/* Attendance Window */}
            {hasAttendanceWindow && (
              <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-3 py-2 rounded-md w-fit">
                <Timer className="h-4 w-4" />
                <span>
                  Attendance: {formatEventTime(event.event_start!)} - {formatEventTime(event.event_end!)}
                </span>
              </div>
            )}

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
                <FileText className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                <p className="line-clamp-2">{event.description}</p>
              </div>
            )}
            
            {/* Creator */}
            {showCreator && creator && (
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                <User className="h-3 w-3" />
                <span>Created by {creator.name}</span>
              </div>
            )}
          </div>

          {/* Date Badge */}
          <div className={`flex flex-col items-center justify-center rounded-lg p-3 min-w-[70px] ${config.dateBoxClass}`}>
            <span className={`text-2xl font-bold ${config.dateTextClass}`}>
              {new Date(event.date).getDate()}
            </span>
            <span className={`text-xs font-medium uppercase ${config.dateTextClass}`}>
              {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
