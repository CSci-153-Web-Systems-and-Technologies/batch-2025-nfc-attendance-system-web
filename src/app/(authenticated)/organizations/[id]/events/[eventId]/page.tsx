import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { Calendar, MapPin, Users, User, TrendingUp, Clock, Timer, AlertCircle, Pencil, Download, Image as ImageIcon, FileIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AttendanceList } from '@/components/events/attendance-list'
import { getEventStatus, formatEventDate, formatEventTime } from '@/lib/utils'
import { MapPreviewWrapper } from '@/components/events/map-preview-wrapper'

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

  // Check if user can manage (edit/delete) this event
  const { data: canManage, error: canManageError } = await supabase
    .rpc('can_manage_event', {
      p_event_id: eventId,
      p_user_id: user.id,
    })

  const canManageEvent = !canManageError && canManage === true

  // Check if current user has attended
  const { data: hasAttended, error: attendedError } = await supabase
    .rpc('is_user_attended', {
      p_event_id: eventId,
      p_user_id: user.id,
    })

  const userAttended = !attendedError && hasAttended === true

  // Get event files
  const { data: eventFiles } = await supabase
    .from('event_files')
    .select('*')
    .eq('event_id', eventId)
    .order('uploaded_at', { ascending: false })

  const files = eventFiles || []

  // Resolve featured image URL (supports private buckets via signed URLs)
  // Always derive URL from storage path to avoid stale/broken public URLs
  let featuredImageUrl: string | null = null
  if (event.featured_image_storage_path) {
    const { data: signed, error: signedErr } = await supabase.storage
      .from('event-files')
      .createSignedUrl(event.featured_image_storage_path, 60 * 60) // 1 hour
    if (!signedErr && signed?.signedUrl) {
      featuredImageUrl = signed.signedUrl
    } else {
      // Fallback to public URL if signed URL fails
      const { data: pub } = await supabase.storage
        .from('event-files')
        .getPublicUrl(event.featured_image_storage_path)
      featuredImageUrl = pub?.publicUrl || null
    }
  } else if (event.featured_image_url) {
    // Fallback: if only featured_image_url exists (legacy), try to extract path and sign it
    const match = event.featured_image_url.match(/\/event-files\/(.+)$/)
    if (match) {
      const extractedPath = match[1]
      const { data: signed, error: signedErr } = await supabase.storage
        .from('event-files')
        .createSignedUrl(extractedPath, 60 * 60)
      if (!signedErr && signed?.signedUrl) {
        featuredImageUrl = signed.signedUrl
      } else {
        featuredImageUrl = event.featured_image_url // Use as-is if signing fails
      }
    } else {
      featuredImageUrl = event.featured_image_url
    }
  }

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
    <div className="min-h-screen bg-muted/30 py-8 px-4 md:px-8">
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
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {event.event_name}
                </h1>
                {eventStatus === 'ongoing' && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold rounded-full">
                    Currently Happening
                  </span>
                )}
                {eventStatus === 'upcoming' && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold rounded-full">
                    Upcoming
                  </span>
                )}
                {eventStatus === 'past' && (
                  <span className="px-3 py-1 bg-muted text-muted-foreground text-sm font-semibold rounded-full">
                    Past
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {organization.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {canManageEvent && (
                <Link href={`/organizations/${organizationId}/events/${eventId}/edit`}>
                  <Button variant="outline" className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit Event
                  </Button>
                </Link>
              )}
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
        </div>

          {/* Featured Image Hero */}
          {featuredImageUrl && (
            <div className="mb-6">
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <img
                  src={featuredImageUrl}
                  alt={`${event.event_name} poster`}
                  className="absolute top-0 left-0 w-full h-full object-cover rounded-lg shadow-md"
                />
              </div>
            </div>
          )}

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

              {/* Map Preview - Visible to all members, radius only for attendance takers */}
              {event.latitude && event.longitude && (
                <div className="md:col-span-2">
                  <p className="font-medium text-foreground mb-2">Event Location Map</p>
                  <MapPreviewWrapper
                    latitude={event.latitude}
                    longitude={event.longitude}
                    locationText={event.location}
                    attendanceRadiusMeters={
                      ['owner', 'admin', 'attendance_taker'].includes(membership.role)
                        ? event.attendance_radius_meters
                        : null
                    }
                  />
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

          {/* Event Files Card - Always show if files exist */}
          {files.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Event Files</span>
                  {(userAttended || membership.role === 'owner' || membership.role === 'admin') && !userAttended && (
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                      Viewing as {membership.role}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(userAttended || membership.role === 'owner' || membership.role === 'admin') ? (
                  <>
                    <div className="space-y-3">
                      {files.map((file) => {
                        const isImage = file.file_type === 'image'
                        const fileExtension = file.mime_type.split('/')[1].toUpperCase()
                        const fileSizeFormatted = 
                          file.file_size_bytes < 1024
                            ? `${file.file_size_bytes} B`
                            : file.file_size_bytes < 1024 * 1024
                            ? `${(file.file_size_bytes / 1024).toFixed(1)} KB`
                            : `${(file.file_size_bytes / 1024 / 1024).toFixed(1)} MB`

                        return (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 p-4 bg-muted/50 rounded-md border border-input hover:border-primary/50 transition-colors"
                          >
                            {isImage ? (
                              <div className="flex-shrink-0">
                                <img
                                  src={file.file_url}
                                  alt={file.file_name}
                                  className="h-16 w-16 object-cover rounded border border-input"
                                />
                              </div>
                            ) : (
                              <FileIcon className="h-8 w-8 text-primary flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {file.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {fileSizeFormatted} • {fileExtension}
                                {file.uploaded_at && (
                                  <> • Uploaded {new Date(file.uploaded_at).toLocaleDateString()}</>
                                )}
                              </p>
                            </div>
                            <a
                              href={file.file_url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0"
                            >
                              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                                <Download className="h-4 w-4" />
                                Download
                              </button>
                            </a>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      {files.length} file{files.length !== 1 ? 's' : ''} available for this event
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {files.length} file{files.length !== 1 ? 's' : ''} available
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      You must be recorded as attending this event to access the files.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
            <AttendanceList eventId={eventId} organizationId={organizationId} userRole={membership.role} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
