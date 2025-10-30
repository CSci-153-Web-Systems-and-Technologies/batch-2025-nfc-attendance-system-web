import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { requireOrgPermission, isAuthorized } from '@/lib/authorization'

/**
 * GET /api/organization/[id]/join-requests
 * Get pending join requests for an organization
 * Requires: Owner or Admin role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or admin of the organization
    const authResult = await requireOrgPermission(
      user.id,
      organizationId,
      'canManageMembers'
    )

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Fetch pending join requests with user details
    const { data: requests, error: requestsError } = await supabase
      .from('organization_join_requests')
      .select(`
        id,
        organization_id,
        user_id,
        status,
        requested_at,
        reviewed_at,
        reviewed_by,
        created_at,
        updated_at,
        users!organization_join_requests_user_id_fkey (
          id,
          name,
          email,
          user_type
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })

    if (requestsError) {
      console.error('Error fetching join requests:', requestsError)
      return NextResponse.json(
        { error: 'Failed to fetch join requests' },
        { status: 500 }
      )
    }

    // Transform the data to match our type structure
    const formattedRequests = (requests || []).map((request: any) => ({
      id: request.id,
      organization_id: request.organization_id,
      user_id: request.user_id,
      status: request.status,
      requested_at: request.requested_at,
      reviewed_at: request.reviewed_at,
      reviewed_by: request.reviewed_by,
      created_at: request.created_at,
      updated_at: request.updated_at,
      user: request.users
    }))

    return NextResponse.json({
      requests: formattedRequests,
      count: formattedRequests.length,
    })
  } catch (error) {
    console.error('Error fetching join requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
