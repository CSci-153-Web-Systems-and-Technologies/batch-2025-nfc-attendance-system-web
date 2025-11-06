import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

/**
 * POST /api/membership/approve
 * Approve a join request
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

    // Call the approve_join_request database function
    const { data, error } = await supabase.rpc('approve_join_request', {
      p_request_id: request_id,
      p_reviewer_id: user.id,
    })

    if (error) {
      console.error('Error approving join request:', error)
      return NextResponse.json(
        { error: 'Failed to approve join request' },
        { status: 500 }
      )
    }

    // Check if the function returned true (success)
    if (!data) {
      return NextResponse.json(
        { error: 'Unable to approve request. You may not have permission or the request may not be pending.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      message: 'Join request approved successfully',
      success: true,
    })
  } catch (error) {
    console.error('Error in approve request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
