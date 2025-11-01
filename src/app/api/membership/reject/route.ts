import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

/**
 * POST /api/membership/reject
 * Reject a join request
 * Requires: Owner or Admin role of the organization
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { request_id } = body

    if (!request_id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    // Get the join request
    const { data: joinRequest, error: fetchError } = await supabase
      .from('organization_join_requests')
      .select('organization_id, status')
      .eq('id', request_id)
      .single()

    if (fetchError || !joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      )
    }

    // Check if request is pending
    if (joinRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending requests can be rejected' },
        { status: 400 }
      )
    }

    // Check if user is admin/owner of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', joinRequest.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['Owner', 'Admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to reject this request' },
        { status: 403 }
      )
    }

    // Update request status to rejected
    const { error: updateError } = await supabase
      .from('organization_join_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', request_id)

    if (updateError) {
      console.error('Error rejecting join request:', updateError)
      return NextResponse.json(
        { error: 'Failed to reject join request' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Join request rejected successfully',
      success: true,
    })
  } catch (error) {
    console.error('Error in reject request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
