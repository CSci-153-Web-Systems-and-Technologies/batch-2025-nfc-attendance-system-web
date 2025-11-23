import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { AttendanceScanner } from '@/components/events/attendance-scanner'

export default async function EventScannerPage({
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

  // Get event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      *,
      organization:organizations(id, name, tag)
    `)
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    redirect(`/organizations/${organizationId}/events`)
  }

  // Verify user is a member and can take attendance
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    redirect('/organizations')
  }

  // Check if user can take attendance
  const { data: canTakeAttendanceResult, error: canTakeError } = await supabase
    .rpc('can_take_attendance', {
      p_event_id: eventId,
      p_user_id: user.id,
    })

  const canTakeAttendance = !canTakeError && canTakeAttendanceResult === true

  if (!canTakeAttendance) {
    redirect(`/organizations/${organizationId}/events/${eventId}`)
  }

  return (
    <div className="min-h-screen bg-violet-50/30 py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <AttendanceScanner
          eventId={eventId}
          organizationId={organizationId}
          eventName={event.event_name}
          organizationName={event.organization.name}
        />
      </div>
    </div>
  )
}
