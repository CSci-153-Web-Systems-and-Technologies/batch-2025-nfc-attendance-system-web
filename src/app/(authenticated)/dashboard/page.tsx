'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Info, Plus, Building2, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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

        const [upcomingRes, pastRes] = await Promise.all([
          fetch('/api/event?upcoming=true&limit=20', { cache: 'no-store' }),
          fetch('/api/event?past=true&limit=20', { cache: 'no-store' }),
        ])

        if (!upcomingRes.ok) {
          throw new Error('Failed to load upcoming events')
        }
        if (!pastRes.ok) {
          throw new Error('Failed to load past events')
        }

        const upcomingData: DashboardEvent[] = await upcomingRes.json()
        const pastData: DashboardEvent[] = await pastRes.json()

        // Compute today's (ongoing) events using local date
        const today = new Date()
        const isSameDay = (a: Date, b: Date) =>
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate()

        const todayEvents = upcomingData.filter((e) =>
          isSameDay(new Date(e.date), today)
        )

        // Upcoming (exclude today to avoid duplication)
        const futureEvents = upcomingData.filter(
          (e) => !isSameDay(new Date(e.date), today)
        )

        setOnGoing(todayEvents)
        setUpcoming(futureEvents)
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
            <Link href="/dashboard/create-event">
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
                <h2 className="text-lg font-semibold text-foreground">On Going</h2>
              </div>
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                {loading ? (
                  <div className="text-center text-sm text-muted-foreground">Loading events…</div>
                ) : error ? (
                  <div className="text-center text-sm text-destructive">{error}</div>
                ) : onGoing.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-primary rounded-lg px-6 py-3">
                      <p className="text-primary-foreground font-medium">No Current Events On Going</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {onGoing.map((event) => (
                      <div
                        key={event.id}
                        className="bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-border"
                      >
                        <div className="rounded-lg p-4 bg-primary text-primary-foreground">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{event.event_name}</h3>
                              <p className="text-xs opacity-90 mt-1">{event.organization.name}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 text-xs px-3"
                              asChild
                            >
                              <a href={`/organizations/${event.organization_id}/events`}>View</a>
                            </Button>
                          </div>
                          <p className="text-sm opacity-90">
                            {new Date(event.date).toLocaleString()}
                            {event.location ? ` • ${event.location}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Upcoming Events */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
              </div>
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                {loading ? (
                  <div className="text-center text-sm text-muted-foreground">Loading events…</div>
                ) : upcoming.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-primary rounded-lg px-6 py-3">
                      <p className="text-primary-foreground font-medium">No Upcoming Events</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((event) => (
                      <div
                        key={event.id}
                        className="bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-border"
                      >
                        <div className="rounded-lg p-4 bg-accent text-accent-foreground">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{event.event_name}</h3>
                              <p className="text-xs opacity-90 mt-1">{event.organization.name}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-accent-foreground/10 hover:bg-accent-foreground/20 text-accent-foreground border-accent-foreground/30 text-xs px-3"
                              asChild
                            >
                              <a href={`/organizations/${event.organization_id}/events`}>View</a>
                            </Button>
                          </div>
                          <p className="text-sm opacity-90">
                            {new Date(event.date).toLocaleString()}
                            {event.location ? ` • ${event.location}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Finished Events */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Finished Events</h2>
              </div>
              <div className="bg-muted/50 rounded-xl p-8 border border-border">
                {loading ? (
                  <div className="text-center text-sm text-muted-foreground">Loading events…</div>
                ) : finished.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-primary rounded-lg px-6 py-3">
                      <p className="text-primary-foreground font-medium">No Past Events</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {finished.map((event) => (
                      <div
                        key={event.id}
                        className="bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-border"
                      >
                        <div className="rounded-lg p-4 bg-muted text-muted-foreground">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{event.event_name}</h3>
                              <p className="text-xs opacity-75 mt-1">{event.organization.name}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-muted-foreground/10 hover:bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30 text-xs px-3"
                              asChild
                            >
                              <a href={`/organizations/${event.organization_id}/events`}>View</a>
                            </Button>
                          </div>
                          <p className="text-sm opacity-75">
                            {new Date(event.date).toLocaleString()}
                            {event.location ? ` • ${event.location}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
