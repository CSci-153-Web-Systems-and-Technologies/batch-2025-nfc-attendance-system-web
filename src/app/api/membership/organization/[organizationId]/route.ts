import { NextResponse } from 'next/server'
import { MembershipService } from '@/lib/services/membership.service'
import { createClient } from '@/lib/server'

/**
 * GET /api/membership/organization/[organizationId]
 * Get all members of a specific organization
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

    // Check if user is a member of the organization
    const userMembership = await MembershipService.getUserMembershipInOrganization(
      user.id,
      organizationId
    )

    if (!userMembership) {
      return NextResponse.json(
        { error: 'Forbidden: Not a member of this organization' },
        { status: 403 }
      )
    }

    const members = await MembershipService.getOrganizationMembers(
      organizationId
    )

    return NextResponse.json({ members }, { status: 200 })
  } catch (error) {
    console.error('Error fetching organization members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
