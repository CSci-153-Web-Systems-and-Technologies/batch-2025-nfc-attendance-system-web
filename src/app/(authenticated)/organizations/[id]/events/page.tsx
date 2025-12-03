import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { EventsListView } from '@/components/events/events-list-view'

export default async function OrganizationEventsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get organization details
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, tag')
    .eq('id', id)
    .single()

  if (orgError || !organization) {
    redirect('/organizations')
  }

  // Check if user is a member
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', id)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    redirect(`/organizations`)
  }

  // Get organization events
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select(`
      *,
      users!fk_created_by_user(name, email)
    `)
    .eq('organization_id', id)
    .order('date', { ascending: false })

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <EventsListView
        organizationId={organization.id}
        organizationName={organization.name}
        userRole={membership.role}
        events={events || []}
      />
    </div>
  )
}
