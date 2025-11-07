import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { UserService } from '@/lib/services/user.service'
import { OrganizationMainView } from '@/components/organizations/organization-main-view'

export default async function OrganizationsPage() {
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

  // Fetch user's organizations (use auth user ID directly)
  const organizations = await OrganizationService.getUserOrganizations(supabase, user.id)

  return (
    <div className="min-h-screen bg-background">
      <OrganizationMainView organizations={organizations} />
    </div>
  )
}
