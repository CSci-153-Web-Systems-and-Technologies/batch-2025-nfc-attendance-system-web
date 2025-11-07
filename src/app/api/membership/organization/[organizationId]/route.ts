import { NextResponse } from 'next/server'
import { MembershipService } from '@/lib/services/membership.service'
import { createClient } from '@/lib/server'
import type { MembershipRole } from '@/types/membership'

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
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const roleParam = searchParams.get('role') as MembershipRole | null

    const limit = Math.min(Number(limitParam ?? 20), 50)
    const offset = Number(offsetParam ?? 0)

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

    const members = await MembershipService.getOrganizationMembersPaged(
      organizationId,
      {
        limit,
        offset,
        role: roleParam ?? undefined,
      }
    )

    // Get total count (respect role filter)
    const total = await MembershipService.countMemberships({
      organization_id: organizationId,
      role: roleParam ?? undefined,
    })

    return NextResponse.json({ members, total }, { status: 200 })
  } catch (error) {
    console.error('Error fetching organization members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
