import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { MembershipService } from '@/lib/services/membership.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { MembersView } from '@/components/organizations/members-view'

interface MembersPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id: organizationId } = await params

  // Check if user is a member of the organization
  const userMembership = await MembershipService.getUserMembershipInOrganization(
    user.id,
    organizationId
  )

  if (!userMembership) {
    redirect('/organizations')
  }

  // Get organization details
  const organization = await OrganizationService.getOrganizationById(organizationId)

  if (!organization) {
    redirect('/organizations')
  }

  // Get all members of the organization
  const members = await MembershipService.getOrganizationMembers(organizationId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      <MembersView 
        organization={organization} 
        members={members}
        currentUserRole={userMembership.role}
      />
    </div>
  )
}
