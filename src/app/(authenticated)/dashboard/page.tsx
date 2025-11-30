'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Info, Plus, Building2, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onGoing, setOnGoing] = useState<DashboardEvent[]>([])
  const [upcoming, setUpcoming] = useState<DashboardEvent[]>([])
  const [finished, setFinished] = useState<DashboardEvent[]>([])

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

  const [currentDate, setCurrentDate] = useState(new Date()) // Current date

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
          
          {/* Create Event Button - visible on all screens */}
          <Link href="/dashboard/create-event" className="md:hidden">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Quick Access Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Organizations Card */}
            <Link href="/organizations">
              <div className="bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-border hover:border-primary/50 cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Building2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground mb-1">Organizations</h3>
                    <p className="text-sm text-muted-foreground">View and manage your organizations</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Create Event Card */}
            <Link href="/events/create">
              <div className="bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-border hover:border-primary/50 cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Calendar className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground mb-1">Create Event</h3>
                    <p className="text-sm text-muted-foreground">Set up a new event for your organization</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Members Card (Placeholder) */}
            <div className="bg-card rounded-xl p-5 shadow-sm border border-border opacity-60 cursor-not-allowed">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-card-foreground mb-1">Members</h3>
                  <p className="text-sm text-muted-foreground">Manage organization members</p>
                  <span className="text-xs text-muted-foreground mt-1 inline-block">Coming soon</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Side - Events */}
          <div className="flex-1 space-y-6">
            {/* On Going Events */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Currently Happening</h2>
              </div>
              {loading ? (
                <div className="bg-muted rounded-xl p-8 border border-border">
                  <div className="text-center text-sm text-muted-foreground">Loading events…</div>
                </div>
              ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-8 border border-red-200 dark:border-red-800">
                  <div className="text-center text-sm text-red-600 dark:text-red-400">{error}</div>
                </div>
              ) : onGoing.length === 0 ? (
                <Card className="bg-card shadow-md">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No events currently happening
                      </h3>
                      <p className="text-muted-foreground">
                        Events will appear here when they are in progress.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {onGoing.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      status="ongoing"
                      showOrganization={true}
                      onClick={() => router.push(`/organizations/${event.organization_id}/events/${event.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming Events */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
              </div>
              {loading ? (
                <div className="bg-muted rounded-xl p-8 border border-border">
                  <div className="text-center text-sm text-muted-foreground">Loading events…</div>
                </div>
              ) : upcoming.length === 0 ? (
                <Card className="bg-card shadow-md">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No upcoming events
                      </h3>
                      <p className="text-muted-foreground">
                        Check back later for new events.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {upcoming.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      status="upcoming"
                      showOrganization={true}
                      onClick={() => router.push(`/organizations/${event.organization_id}/events/${event.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Finished Events */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Past Events</h2>
              </div>
              {loading ? (
                <div className="bg-muted rounded-xl p-8 border border-border">
                  <div className="text-center text-sm text-muted-foreground">Loading events…</div>
                </div>
              ) : finished.length === 0 ? (
                <Card className="bg-card shadow-md">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No past events
                      </h3>
                      <p className="text-muted-foreground">
                        Your event history will appear here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {finished.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      status="past"
                      showOrganization={true}
                      onClick={() => router.push(`/organizations/${event.organization_id}/events/${event.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Side - Calendar (Desktop Only) */}
          <div className="hidden lg:block w-96">
            <div className="bg-card rounded-xl shadow-md border border-border p-6 sticky top-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {currentMonth} {currentYear}
                </h3>
                <div className="flex gap-2">
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

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
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
                  
                  return (
                    <div
                      key={index}
                      className={`
                        aspect-square flex items-center justify-center text-sm rounded-lg
                        ${day === null ? '' : 'hover:bg-accent hover:text-accent-foreground cursor-pointer'}
                        ${isToday ? 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90' : ''}
                        ${day && !isToday ? 'text-foreground' : ''}
                      `}
                    >
                      {day}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
