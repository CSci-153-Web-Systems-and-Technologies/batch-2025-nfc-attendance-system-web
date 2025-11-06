import { NextResponse } from 'next/server'
import { MembershipService } from '@/lib/services/membership.service'
import { createClient } from '@/lib/server'
import type { UpdateMembershipInput } from '@/types/membership'

/**
 * GET /api/membership/[id]
 * Get a specific membership by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const { id: membershipId } = await params

    const membership = await MembershipService.getMembershipWithDetails(
      membershipId
    )

    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to view this membership
    // User can view if they're the member OR if they have admin access to the org
    const isOwnMembership = membership.user_id === user.id
    const hasOrgAccess = await MembershipService.userHasPermission(
      user.id,
      membership.organization_id,
      'Admin'
    )

    if (!isOwnMembership && !hasOrgAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ membership }, { status: 200 })
  } catch (error) {
    console.error('Error fetching membership:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/membership/[id]
 * Update a membership (change role)
 * Body: { role }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const { id: membershipId } = await params
    const body = await request.json()
    const { role } = body as UpdateMembershipInput

    if (!role) {
      return NextResponse.json(
        { error: 'Missing required field: role' },
        { status: 400 }
      )
    }

    // Get the membership to check organization
    const existingMembership = await MembershipService.getMembershipById(
      membershipId
    )

    if (!existingMembership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      )
    }

    // Check if requesting user has permission (Admin or Owner)
    const hasPermission = await MembershipService.userHasPermission(
      user.id,
      existingMembership.organization_id,
      'Admin'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admins and Owners can update roles' },
        { status: 403 }
      )
    }

    // Cannot change Owner role directly
    if (existingMembership.role === 'Owner' || role === 'Owner') {
      return NextResponse.json(
        { error: 'Cannot change Owner role. Use transfer ownership instead.' },
        { status: 400 }
      )
    }

    const updatedMembership = await MembershipService.updateMembership(
      membershipId,
      { role }
    )

    if (!updatedMembership) {
      return NextResponse.json(
        { error: 'Failed to update membership' },
        { status: 400 }
      )
    }

    return NextResponse.json({ membership: updatedMembership }, { status: 200 })
  } catch (error) {
    console.error('Error updating membership:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/membership/[id]
 * Remove a member from an organization
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const { id: membershipId } = await params

    // Get the membership to check organization and role
    const membership = await MembershipService.getMembershipById(membershipId)

    if (!membership) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      )
    }

    // Check if user is removing themselves (members can leave) or if they have admin access
    const isSelfRemoval = membership.user_id === user.id
    const hasPermission = await MembershipService.userHasPermission(
      user.id,
      membership.organization_id,
      'Admin'
    )

    if (!isSelfRemoval && !hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admins and Owners can remove members' },
        { status: 403 }
      )
    }

    // Cannot remove Owner (must transfer ownership first)
    if (membership.role === 'Owner') {
      return NextResponse.json(
        { error: 'Cannot remove Owner. Transfer ownership first.' },
        { status: 400 }
      )
    }

    const success = await MembershipService.deleteMembership(membershipId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove membership' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Membership removed successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting membership:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
