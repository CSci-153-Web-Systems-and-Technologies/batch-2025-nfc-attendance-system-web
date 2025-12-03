'use client'

import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar, X, Sparkles, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUserProfile } from '@/hooks/use-user-profile'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EventCard } from '@/components/events/event-card'

// Event shape returned by /api/event (EventWithOrganization)
type DashboardEvent = {
  id: string
  event_name: string
  date: string
  organization_id: string
  description: string | null
  location: string | null
  created_by: string
  created_at: string
  updated_at: string
  organization: {
    id: string
    name: string
  }
}

// Helper to format date as YYYY-MM-DD for comparison
const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Event status type for calendar dots
type EventStatus = 'ongoing' | 'upcoming' | 'past'

// Get time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Format event date for display in banner
const formatEventDate = (dateString: string): string => {
  const eventDate = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // Check if it's today
  if (eventDate.toDateString() === today.toDateString()) {
    return `today at ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }
  
  // Check if it's tomorrow
  if (eventDate.toDateString() === tomorrow.toDateString()) {
    return `tomorrow at ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }
  
  // Otherwise show full date
  return eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUserProfile()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onGoing, setOnGoing] = useState<DashboardEvent[]>([])
  const [upcoming, setUpcoming] = useState<DashboardEvent[]>([])
  const [finished, setFinished] = useState<DashboardEvent[]>([])
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
  // Get first name for greeting
  const firstName = user?.name?.split(' ')[0] || 'there'

  // Fetch events for dashboard
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)

        const [ongoingRes, upcomingRes, pastRes] = await Promise.all([
          fetch('/api/event?ongoing=true&limit=20', { cache: 'no-store' }),
          fetch('/api/event?upcoming=true&limit=20', { cache: 'no-store' }),
          fetch('/api/event?past=true&limit=20', { cache: 'no-store' }),
        ])

        if (!ongoingRes.ok) {
          throw new Error('Failed to load ongoing events')
        }
        if (!upcomingRes.ok) {
          throw new Error('Failed to load upcoming events')
        }
        if (!pastRes.ok) {
          throw new Error('Failed to load past events')
        }

        const ongoingData: DashboardEvent[] = await ongoingRes.json()
        const upcomingData: DashboardEvent[] = await upcomingRes.json()
        const pastData: DashboardEvent[] = await pastRes.json()

        setOnGoing(ongoingData)
        setUpcoming(upcomingData)
        setFinished(pastData)
      } catch (err: any) {
        console.error('Dashboard events load error:', err)
        setError(err.message || 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Build event date map for calendar indicators
  const eventDateMap = useMemo(() => {
    const map = new Map<string, Set<EventStatus>>()
    
    const addToMap = (events: DashboardEvent[], status: EventStatus) => {
      events.forEach(event => {
        const dateKey = formatDateKey(new Date(event.date))
        if (!map.has(dateKey)) {
          map.set(dateKey, new Set())
        }
        map.get(dateKey)!.add(status)
      })
    }
    
    addToMap(onGoing, 'ongoing')
    addToMap(upcoming, 'upcoming')
    addToMap(finished, 'past')
    
    return map
  }, [onGoing, upcoming, finished])

  // Filter events based on selected date
  const filterEventsByDate = (events: DashboardEvent[]): DashboardEvent[] => {
    if (!selectedDate) return events
    return events.filter(event => formatDateKey(new Date(event.date)) === selectedDate)
  }

  const filteredOngoing = filterEventsByDate(onGoing)
  const filteredUpcoming = filterEventsByDate(upcoming)
  const filteredPast = filterEventsByDate(finished)

  // Format selected date for display
  const formatSelectedDateDisplay = (dateKey: string): string => {
    const [year, month, day] = dateKey.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Calendar logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const currentMonth = monthNames[currentDate.getMonth()]
  const currentYear = currentDate.getFullYear()

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  // Generate calendar days
  const calendarDays = []
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  // Add the days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </h1>
          
          {/* Create Event Button - visible on mobile only */}
          <Link href="/events/create" className="lg:hidden">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Welcome Banner */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
          <CardContent className="py-4 relative">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                {/* Greeting */}
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    {getGreeting()}, {userLoading ? (
                      <span className="inline-block w-24 h-5 bg-muted animate-pulse rounded" />
                    ) : (
                      <span>{firstName}!</span>
                    )} 👋
                  </h2>
                </div>
                
                {/* Dynamic Event Status Message */}
                <div className="text-sm text-muted-foreground">
                  {loading ? (
                    <span className="inline-block w-48 h-4 bg-muted animate-pulse rounded" />
                  ) : onGoing.length > 0 ? (
                    <button
                      onClick={() => router.push(`/organizations/${onGoing[0].organization_id}/events/${onGoing[0].id}`)}
                      className="flex items-center gap-2 hover:text-foreground transition-colors group"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span>
                        <span className="font-medium text-green-600 dark:text-green-400">Live now:</span>{' '}
                        <span className="group-hover:underline">{onGoing[0].event_name}</span>
                        {onGoing.length > 1 && (
                          <span className="text-muted-foreground"> +{onGoing.length - 1} more</span>
                        )}
                      </span>
                    </button>
                  ) : upcoming.length > 0 ? (
                    <button
                      onClick={() => router.push(`/organizations/${upcoming[0].organization_id}/events/${upcoming[0].id}`)}
                      className="flex items-center gap-2 hover:text-foreground transition-colors group"
                    >
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">Next up:</span>{' '}
                        <span className="group-hover:underline">{upcoming[0].event_name}</span>{' '}
                        <span className="text-muted-foreground">• {formatEventDate(upcoming[0].date)}</span>
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>No upcoming events — enjoy your free time!</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Decorative element */}
              <div className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
                <Calendar className="h-20 w-20 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Filter Indicator */}
        {selectedDate && (
          <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Showing events for {formatSelectedDateDisplay(selectedDate)}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                className="ml-1 p-0.5 hover:bg-primary/20 rounded transition-colors"
              >
                <X className="h-4 w-4 text-primary" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Side - Events */}
          <div className="flex-1 space-y-6">
            {/* On Going Events - Hide when filtering and no results */}
            {(!selectedDate || filteredOngoing.length > 0) && (
            <section className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  <h2 className="text-lg font-semibold text-foreground">Currently Happening</h2>
                </div>
                {filteredOngoing.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                    {filteredOngoing.length}
                  </span>
                )}
              </div>
              {loading ? (
                <div className="bg-muted rounded-xl p-8 border border-border">
                  <div className="text-center text-sm text-muted-foreground">Loading events…</div>
                </div>
              ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-8 border border-red-200 dark:border-red-800">
                  <div className="text-center text-sm text-red-600 dark:text-red-400">{error}</div>
                </div>
              ) : filteredOngoing.length === 0 ? (
                <Card className="bg-card shadow-md">
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Calendar className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <h3 className="text-base font-medium text-foreground mb-1">
                        {selectedDate ? 'No ongoing events on this date' : 'No events currently happening'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDate ? 'Try selecting a different date' : 'Events will appear here when they are in progress.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredOngoing.map((event) => (
                    <div 
                      key={event.id} 
                      className="animate-in fade-in slide-in-from-left-2 duration-300"
                    >
                      <EventCard
                        event={event}
                        status="ongoing"
                        showOrganization={true}
                        onClick={() => router.push(`/organizations/${event.organization_id}/events/${event.id}`)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
            )}

            {/* Upcoming Events - Hide when filtering and no results */}
            {(!selectedDate || filteredUpcoming.length > 0) && (
            <section className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                  <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
                </div>
                {filteredUpcoming.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                    {filteredUpcoming.length}
                  </span>
                )}
              </div>
              {loading ? (
                <div className="bg-muted rounded-xl p-8 border border-border">
                  <div className="text-center text-sm text-muted-foreground">Loading events…</div>
                </div>
              ) : filteredUpcoming.length === 0 ? (
                <Card className="bg-card shadow-md">
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Calendar className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <h3 className="text-base font-medium text-foreground mb-1">
                        {selectedDate ? 'No upcoming events on this date' : 'No upcoming events'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDate ? 'Try selecting a different date' : 'Check back later for new events.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredUpcoming.map((event) => (
                    <div 
                      key={event.id} 
                      className="animate-in fade-in slide-in-from-left-2 duration-300"
                    >
                      <EventCard
                        event={event}
                        status="upcoming"
                        showOrganization={true}
                        onClick={() => router.push(`/organizations/${event.organization_id}/events/${event.id}`)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
            )}

            {/* Finished Events - Hide when filtering and no results */}
            {(!selectedDate || filteredPast.length > 0) && (
            <section className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-400"></span>
                  <h2 className="text-lg font-semibold text-foreground">Past Events</h2>
                </div>
                {filteredPast.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                    {filteredPast.length}
                  </span>
                )}
              </div>
              {loading ? (
                <div className="bg-muted rounded-xl p-8 border border-border">
                  <div className="text-center text-sm text-muted-foreground">Loading events…</div>
                </div>
              ) : filteredPast.length === 0 ? (
                <Card className="bg-card shadow-md">
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Calendar className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <h3 className="text-base font-medium text-foreground mb-1">
                        {selectedDate ? 'No past events on this date' : 'No past events'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDate ? 'Try selecting a different date' : 'Your event history will appear here.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredPast.map((event) => (
                    <div 
                      key={event.id} 
                      className="animate-in fade-in slide-in-from-left-2 duration-300"
                    >
                      <EventCard
                        event={event}
                        status="past"
                        showOrganization={true}
                        onClick={() => router.push(`/organizations/${event.organization_id}/events/${event.id}`)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
            )}

            {/* No events message when filtering returns nothing */}
            {selectedDate && filteredOngoing.length === 0 && filteredUpcoming.length === 0 && filteredPast.length === 0 && (
              <Card className="bg-card shadow-md animate-in fade-in duration-300">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No events on this date
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      There are no events scheduled for {formatSelectedDateDisplay(selectedDate)}
                    </p>
                    <Button variant="outline" onClick={() => setSelectedDate(null)}>
                      Clear filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Side - Calendar (Desktop Only) */}
          <div className="hidden lg:block w-96">
            <div className="bg-card rounded-xl shadow-md border border-border p-6 sticky top-6">
              {/* Calendar Header with Create Event Button */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {currentMonth} {currentYear}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={previousMonth}
                    className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextMonth}
                    className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Create Event Button */}
              <Link href="/events/create" className="block mb-4">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </Link>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                  const today = new Date()
                  const isToday = day === today.getDate() && 
                                  currentDate.getMonth() === today.getMonth() && 
                                  currentDate.getFullYear() === today.getFullYear()
                  
                  // Get event statuses for this day
                  const dateKey = day ? formatDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)) : null
                  const eventStatuses = dateKey ? eventDateMap.get(dateKey) : null
                  const hasEvents = eventStatuses && eventStatuses.size > 0
                  const isSelected = dateKey === selectedDate
                  
                  const handleDayClick = () => {
                    if (day && hasEvents) {
                      if (isSelected) {
                        setSelectedDate(null)
                      } else {
                        setSelectedDate(dateKey)
                      }
                    }
                  }
                  
                  return (
                    <div
                      key={index}
                      onClick={handleDayClick}
                      className={`
                        aspect-square flex flex-col items-center justify-center text-sm rounded-lg relative
                        transition-all duration-200
                        ${day === null ? '' : hasEvents ? 'cursor-pointer hover:bg-accent hover:text-accent-foreground' : 'text-foreground'}
                        ${day && isToday && !isSelected ? 'bg-primary text-primary-foreground font-semibold' : ''}
                        ${day && isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-card bg-primary/10' : ''}
                      `}
                    >
                      <span className={isSelected ? 'font-semibold text-primary' : ''}>{day}</span>
                      {/* Event indicator dots */}
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-0.5">
                          {eventStatuses.has('ongoing') && (
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          )}
                          {eventStatuses.has('upcoming') && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          )}
                          {eventStatuses.has('past') && (
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Ongoing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Upcoming</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    <span>Past</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
