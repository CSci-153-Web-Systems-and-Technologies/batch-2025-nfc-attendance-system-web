import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { CreateEventForm } from '@/components/events/create-event-form'

export default async function CreateEventPage({
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

  // Check if user is a member with permission to create events
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', id)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    redirect(`/organizations`)
  }

  // Only Owner, Admin, and Attendance Taker can create events
  if (!['Owner', 'Admin', 'Attendance Taker'].includes(membership.role)) {
    redirect(`/organizations`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <CreateEventForm
        organizationId={organization.id}
        organizationName={organization.name}
      />
    </div>
  )
}
