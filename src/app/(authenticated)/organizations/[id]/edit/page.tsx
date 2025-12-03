import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { UserService } from '@/lib/services/user.service'
import { hasPermission } from '@/types/organization'
import { EditOrganizationForm } from '@/components/organizations/edit-organization-form'

interface EditOrganizationPageProps {
  params: Promise<{ id: string }>
}

export default async function EditOrganizationPage({ params }: EditOrganizationPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const userProfile = await UserService.getUserById(user.id)
  if (!userProfile) {
    redirect('/complete-profile')
  }

  // Get organization with user's role
  const organization = await OrganizationService.getOrganizationWithRole(id, user.id)
  
  if (!organization) {
    redirect('/organizations')
  }

  // Check if user has permission to edit organization
  if (!hasPermission(organization.user_role, 'canManageOrganization')) {
    redirect(`/organizations/${id}`)
  }

  return <EditOrganizationForm organization={organization} />
}
