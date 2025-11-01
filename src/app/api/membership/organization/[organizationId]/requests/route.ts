import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

/**
 * GET /api/membership/organization/[organizationId]/requests
 * Get all join requests for a specific organization
 * Only accessible by Owner and Admin of the organization
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId } = await params

    // Check if user is Owner or Admin of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['Owner', 'Admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only Owners and Admins can view join requests' },
        { status: 403 }
      )
    }

    // Get all join requests with user details
    const { data: requests, error } = await supabase
      .from('organization_join_requests')
      .select(`
        *,
        user:users (
          id,
          name,
          email,
          user_type,
          nfc_tag_id
        ),
        reviewer:users!organization_join_requests_reviewed_by_fkey (
          id,
          name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('Error fetching join requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch join requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({ requests: requests || [] }, { status: 200 })
  } catch (error) {
    console.error('Error in get organization requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
