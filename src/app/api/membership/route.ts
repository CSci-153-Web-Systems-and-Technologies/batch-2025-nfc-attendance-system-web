import { NextResponse } from 'next/server'
import { MembershipService } from '@/lib/services/membership.service'
import { createClient } from '@/lib/server'
import type { CreateMembershipInput, MembershipFilters } from '@/types/membership'

/**
 * GET /api/membership
 * Get memberships with optional filters
 * Query params: user_id, organization_id, role
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters: MembershipFilters = {}

    const userId = searchParams.get('user_id')
    const organizationId = searchParams.get('organization_id')
    const role = searchParams.get('role')

    if (userId) filters.user_id = userId
    if (organizationId) filters.organization_id = organizationId
    if (role) filters.role = role as any

    // If filtering by user_id, ensure user can only see their own memberships
    // unless they're querying an organization they have admin access to
    if (filters.user_id && filters.user_id !== user.id) {
      // Check if requesting user has admin access to the organization
      if (filters.organization_id) {
        const hasPermission = await MembershipService.userHasPermission(
          user.id,
          filters.organization_id,
          'Admin'
        )
        if (!hasPermission) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const memberships = await MembershipService.getMemberships(filters)

    return NextResponse.json({ memberships }, { status: 200 })
  } catch (error) {
    console.error('Error fetching memberships:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/membership
 * Create a new membership (add user to organization)
 * Body: { user_id, organization_id, role }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, organization_id, role } = body as CreateMembershipInput

    if (!user_id || !organization_id || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if requesting user has permission to add members (Admin or Owner)
    const hasPermission = await MembershipService.userHasPermission(
      user.id,
      organization_id,
      'Admin'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admins and Owners can add members' },
        { status: 403 }
      )
    }

    // Owner role can only be set through transfer ownership
    if (role === 'Owner') {
      return NextResponse.json(
        { error: 'Cannot directly assign Owner role. Use transfer ownership instead.' },
        { status: 400 }
      )
    }

    const membership = await MembershipService.createMembership({
      user_id,
      organization_id,
      role,
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Failed to create membership. User may already be a member.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ membership }, { status: 201 })
  } catch (error) {
    console.error('Error creating membership:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
