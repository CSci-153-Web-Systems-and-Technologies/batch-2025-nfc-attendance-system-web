import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { MembershipService } from '@/lib/services/membership.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { RequestsView } from '@/components/organizations/requests-view'

interface RequestsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function RequestsPage({ params }: RequestsPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id: organizationId } = await params

  // Check if user is Owner or Admin of the organization
  const userMembership = await MembershipService.getUserMembershipInOrganization(
    user.id,
    organizationId
  )

  if (!userMembership || !['Owner', 'Admin'].includes(userMembership.role)) {
    redirect('/organizations')
  }

  // Get organization details
  const organization = await OrganizationService.getOrganizationById(organizationId)

  if (!organization) {
    redirect('/organizations')
  }

  // Get join requests directly from database
  const { data: requests, error } = await supabase
    .from('organization_join_requests')
    .select(`
      *,
      user:users!fk_user (
        id,
        name,
        email,
        user_type,
        nfc_tag_id
      )
    `)
    .eq('organization_id', organizationId)
    .order('requested_at', { ascending: false })

  // Debug logging
  console.log('Organization ID:', organizationId)
  console.log('Requests found:', requests?.length || 0)
  console.log('Error:', error)
  if (requests && requests.length > 0) {
    console.log('First request:', JSON.stringify(requests[0], null, 2))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      <RequestsView 
        organization={organization} 
        initialRequests={requests || []}
        currentUserRole={userMembership.role}
      />
    </div>
  )
}
