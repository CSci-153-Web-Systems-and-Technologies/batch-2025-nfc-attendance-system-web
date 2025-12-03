import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { UserService } from '@/lib/services/user.service'
import { OrganizationSettings } from '@/components/organizations/organization-settings'

interface SettingsPageProps {
  params: Promise<{ id: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify user profile exists
  const userProfile = await UserService.getUserById(user.id)

  if (!userProfile) {
    redirect('/complete-profile')
  }

  // Fetch organization with user's role
  const organization = await OrganizationService.getOrganizationWithRole(id, user.id)

  if (!organization) {
    notFound()
  }

  // Fetch organization members for transfer ownership dropdown
  const members = await OrganizationService.getOrganizationMembers(id)

  // Get owner info
  const owner = await UserService.getUserById(organization.owner_user_id)

  return (
    <div className="min-h-screen bg-background">
      <OrganizationSettings 
        organization={organization} 
        members={members}
        ownerName={owner?.name || 'Unknown'}
      />
    </div>
  )
}
