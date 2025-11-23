import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { Calendar, MapPin, Users, User, TrendingUp, Clock, Timer, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AttendanceList } from '@/components/events/attendance-list'
import { getEventStatus, formatEventDate, formatEventTime } from '@/lib/utils'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>
}) {
  const { id: organizationId, eventId } = await params
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get event details with organization
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      *,
      organizations!inner(id, name, tag),
      created_by_user:users!fk_created_by_user(id, name, email)
    `)
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    console.error('Error fetching event:', eventError)
    redirect(`/organizations/${organizationId}/events`)
  }

  // Transform organizations array to single object
  const organization = Array.isArray(event.organizations) 
    ? event.organizations[0] 
    : event.organizations

  // Verify user is a member of the organization
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    redirect('/organizations')
  }

  // Get attendance summary using the view
  const { data: summary, error: summaryError } = await supabase
    .from('event_attendance_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  // Check if user can take attendance
  const { data: canTakeAttendanceResult, error: canTakeError } = await supabase
    .rpc('can_take_attendance', {
      p_event_id: eventId,
      p_user_id: user.id,
    })

  const canTakeAttendance = !canTakeError && canTakeAttendanceResult === true

  // Check if current user has attended
  const { data: hasAttended, error: attendedError } = await supabase
    .rpc('is_user_attended', {
      p_event_id: eventId,
      p_user_id: user.id,
    })

  const userAttended = !attendedError && hasAttended === true

  // Get event status
  const eventStatus = getEventStatus(event)

  // Format date
  const eventDate = new Date(event.date)
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  // Format attendance window times if available
  const hasAttendanceWindow = event.event_start && event.event_end
  const attendanceStartDate = hasAttendanceWindow ? formatEventDate(event.event_start) : null
  const attendanceStartTime = hasAttendanceWindow ? formatEventTime(event.event_start) : null
  const attendanceEndDate = hasAttendanceWindow ? formatEventDate(event.event_end) : null
  const attendanceEndTime = hasAttendanceWindow ? formatEventTime(event.event_end) : null

  const totalAttended = summary?.total_attended || 0
  const totalMembers = summary?.total_members || 0
  const attendancePercentage = summary?.attendance_percentage || 0
  const nfcScans = summary?.nfc_scans || 0
  const qrScans = summary?.qr_scans || 0
  const manualEntries = summary?.manual_entries || 0

  return (
    <div className="min-h-screen bg-violet-50/30 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link
            href={`/organizations/${organizationId}/events`}
            className="text-primary hover:underline mb-2 inline-block"
          >
            ← Back to Events
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {event.event_name}
                </h1>
                {eventStatus === 'ongoing' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                    Currently Happening
                  </span>
                )}
                {eventStatus === 'upcoming' && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                    Upcoming
                  </span>
                )}
                {eventStatus === 'past' && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
                    Past
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                {organization.name}
              </p>
            </div>
            {canTakeAttendance && (
              <Link href={`/organizations/${organizationId}/events/${eventId}/scanner`}>
                <Button className="gap-2">
                  <Users className="h-4 w-4" />
                  Take Attendance
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Event Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Date & Time</p>
                  <p className="text-sm text-muted-foreground">{formattedDate}</p>
                  <p className="text-sm text-muted-foreground">{formattedTime}</p>
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Location</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                </div>
              )}

              {/* Created By */}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Created By</p>
                  <p className="text-sm text-muted-foreground">
                    {event.created_by_user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.created_by_user.email}
                  </p>
                </div>
              </div>

              {/* Attendance Window */}
              {hasAttendanceWindow && (
                <div className="flex items-start gap-3">
                  <Timer className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Attendance Window</p>
                    <p className="text-sm text-muted-foreground">
                      {attendanceStartDate === attendanceEndDate ? (
                        <>
                          {attendanceStartDate}<br />
                          {attendanceStartTime} - {attendanceEndTime}
                        </>
                      ) : (
                        <>
                          From: {attendanceStartDate} at {attendanceStartTime}<br />
                          Until: {attendanceEndDate} at {attendanceEndTime}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Your Status */}
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Your Status</p>
                  <p className={`text-sm font-medium ${userAttended ? 'text-green-600' : 'text-amber-600'}`}>
                    {userAttended ? '✓ Attended' : 'Not Attended'}
                  </p>
                </div>
              </div>
            </div>

            {/* Attendance Window Info Alert */}
            {!hasAttendanceWindow && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-amber-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p>
                    This event does not have a defined attendance window. Attendance tracking may not be available.
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="pt-4 border-t border-border">
                <p className="font-medium text-foreground mb-2">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {/* Total Attended */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Attended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {totalAttended} / {totalMembers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalMembers > 0 ? `${totalMembers} total members` : 'No members'}
              </p>
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attendance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-foreground">
                  {attendancePercentage}%
                </div>
                <TrendingUp className={`h-4 w-4 ${attendancePercentage >= 75 ? 'text-green-600' : attendancePercentage >= 50 ? 'text-amber-600' : 'text-red-600'}`} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {attendancePercentage >= 75 ? 'Excellent' : attendancePercentage >= 50 ? 'Good' : 'Low'}
              </p>
            </CardContent>
          </Card>

          {/* NFC Scans */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                NFC Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {nfcScans}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                via NFC tag
              </p>
            </CardContent>
          </Card>

          {/* QR + Manual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                QR + Manual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {qrScans + manualEntries}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {qrScans} QR, {manualEntries} manual
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance List with Real-time Updates */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceList eventId={eventId} organizationId={organizationId} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
