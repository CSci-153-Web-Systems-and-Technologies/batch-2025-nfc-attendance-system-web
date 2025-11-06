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

  const [currentDate, setCurrentDate] = useState(new Date(2025, 7, 15)) // August 15, 2025

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
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-purple-50/30">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Mon, Aug 17
          </h1>
          
          {/* Create Event Button - visible on all screens */}
          <Link href="/dashboard/create-event" className="md:hidden">
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white shadow-md"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Quick Access Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Organizations Card */}
            <Link href="/organizations">
              <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-violet-100 hover:border-violet-300 cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">Organizations</h3>
                    <p className="text-sm text-gray-600">View and manage your organizations</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Create Event Card */}
            <Link href="/dashboard/create-event">
              <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-violet-100 hover:border-violet-300 cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">Create Event</h3>
                    <p className="text-sm text-gray-600">Set up a new event for your organization</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Members Card (Placeholder) */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 opacity-60 cursor-not-allowed">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-300 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">Members</h3>
                  <p className="text-sm text-gray-600">Manage organization members</p>
                  <span className="text-xs text-gray-500 mt-1 inline-block">Coming soon</span>
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
                <Info className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-gray-900">On Going</h2>
              </div>
              <div className="bg-violet-50/50 rounded-xl p-8 border border-violet-100">
                {loading ? (
                  <div className="text-center text-sm text-gray-600">Loading events…</div>
                ) : error ? (
                  <div className="text-center text-sm text-red-600">{error}</div>
                ) : onGoing.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-violet-600 rounded-lg px-6 py-3">
                      <p className="text-white font-medium">No Current Events On Going</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {onGoing.map((event) => (
                      <div
                        key={event.id}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-violet-100"
                      >
                        <div className="rounded-lg p-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{event.event_name}</h3>
                              <p className="text-xs text-white/90 mt-1">{event.organization.name}</p>
                            </div>
                            <Button
                              size="sm"
                              className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs px-3"
                              asChild
                            >
                              <a href={`/organizations/${event.organization_id}/events`}>View</a>
                            </Button>
                          </div>
                          <p className="text-sm text-white/90">
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
                <Info className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
              </div>
              <div className="bg-violet-50/50 rounded-xl p-8 border border-violet-100">
                {loading ? (
                  <div className="text-center text-sm text-gray-600">Loading events…</div>
                ) : upcoming.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-violet-600 rounded-lg px-6 py-3">
                      <p className="text-white font-medium">No Upcoming Events</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((event) => (
                      <div
                        key={event.id}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-violet-100"
                      >
                        <div className="rounded-lg p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{event.event_name}</h3>
                              <p className="text-xs text-white/90 mt-1">{event.organization.name}</p>
                            </div>
                            <Button
                              size="sm"
                              className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs px-3"
                              asChild
                            >
                              <a href={`/organizations/${event.organization_id}/events`}>View</a>
                            </Button>
                          </div>
                          <p className="text-sm text-white/90">
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
                <Info className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-gray-900">Finished Events</h2>
              </div>
              <div className="bg-violet-50/50 rounded-xl p-8 border border-violet-100">
                {loading ? (
                  <div className="text-center text-sm text-gray-600">Loading events…</div>
                ) : finished.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-violet-600 rounded-lg px-6 py-3">
                      <p className="text-white font-medium">No Past Events</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {finished.map((event) => (
                      <div
                        key={event.id}
                        className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-violet-100"
                      >
                        <div className="rounded-lg p-4 bg-gradient-to-r from-gray-600 to-slate-600 text-white">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{event.event_name}</h3>
                              <p className="text-xs text-white/90 mt-1">{event.organization.name}</p>
                            </div>
                            <Button
                              size="sm"
                              className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs px-3"
                              asChild
                            >
                              <a href={`/organizations/${event.organization_id}/events`}>View</a>
                            </Button>
                          </div>
                          <p className="text-sm text-white/90">
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
            <div className="bg-white rounded-xl shadow-md border border-violet-100 p-6 sticky top-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentMonth} {currentYear}
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={previousMonth}
                    className="h-8 w-8 hover:bg-violet-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextMonth}
                    className="h-8 w-8 hover:bg-violet-100"
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
                    className="text-center text-xs font-medium text-gray-500 py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      aspect-square flex items-center justify-center text-sm rounded-lg
                      ${day === null ? '' : 'hover:bg-violet-50 cursor-pointer'}
                      ${day === 15 ? 'bg-violet-600 text-white font-semibold hover:bg-violet-700' : ''}
                      ${day && day !== 15 ? 'text-gray-700' : ''}
                    `}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
