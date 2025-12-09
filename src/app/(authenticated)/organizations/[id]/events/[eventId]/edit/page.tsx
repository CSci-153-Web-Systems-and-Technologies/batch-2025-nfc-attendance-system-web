import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { EditEventForm } from '@/components/events/edit-event-form'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>
}) {
  const supabase = await createClient()
  const { id: organizationId, eventId } = await params

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch event with details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      *,
      organization:organizations(id, name)
    `)
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    redirect(`/organizations/${organizationId}/events`)
  }

  // Check if user can manage this event (creator or organization owner/admin)
  const { data: canManage, error: permError } = await supabase.rpc(
    'can_manage_event',
    {
      p_event_id: eventId,
      p_user_id: user.id,
    }
  )

  if (permError || !canManage) {
    // User doesn't have permission to edit this event
    redirect(`/organizations/${organizationId}/events/${eventId}`)
  }

  return (
    <div className="min-h-screen bg-violet-50/30 py-8 px-4 md:px-8">
      <EditEventForm
        event={event}
        organizationId={organizationId}
        organizationName={event.organization.name}
      />
    </div>
  )
}
