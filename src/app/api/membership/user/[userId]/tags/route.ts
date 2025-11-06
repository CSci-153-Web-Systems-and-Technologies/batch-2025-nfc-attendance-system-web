import { NextResponse } from 'next/server'
import { MembershipService } from '@/lib/services/membership.service'
import { createClient } from '@/lib/server'

/**
 * GET /api/membership/user/[userId]/tags
 * Get user's membership tags (OrganizationName:Role format)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const { userId: targetUserId } = await params

    // Users can only view their own tags
    if (targetUserId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Can only view your own membership tags' },
        { status: 403 }
      )
    }

    const tags = await MembershipService.getUserMembershipTags(targetUserId)

    return NextResponse.json({ tags }, { status: 200 })
  } catch (error) {
    console.error('Error fetching membership tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
