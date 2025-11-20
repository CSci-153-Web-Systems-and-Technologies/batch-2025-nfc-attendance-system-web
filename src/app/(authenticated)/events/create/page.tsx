import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { CreateEventForm } from '@/components/events/create-event-form'
import { OrganizationService } from '@/lib/services/organization.service'

export default async function GlobalCreateEventPage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all organizations where user is a member
  const allOrganizations = await OrganizationService.getUserOrganizations(supabase, user.id)

  // Filter to only Owner and Admin roles
  const eligibleOrganizations = allOrganizations.filter(
    (org) => org.user_role === 'Owner' || org.user_role === 'Admin'
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <CreateEventForm organizations={eligibleOrganizations} />
    </div>
  )
}
