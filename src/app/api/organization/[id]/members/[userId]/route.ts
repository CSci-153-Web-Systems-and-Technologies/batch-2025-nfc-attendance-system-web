import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { UserService } from '@/lib/services/user.service'
import { requireOrgPermission, requireOrgOwner, isAuthorized } from '@/lib/authorization'

/**
 * GET /api/organization/[id]/members/[userId]
 * Get specific member details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: organizationId, userId: targetUserId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const userProfile = await UserService.getUserByAuthId(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user is a member
    const authResult = await requireOrgPermission(
      userProfile.id,
      organizationId,
      'canViewAttendance'
    )

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Get member
    const member = await OrganizationService.getMember(organizationId, targetUserId)

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Get member with user details
    const members = await OrganizationService.getOrganizationMembers(
      organizationId
    )
    const memberWithUser = members.find((m) => m.user_id === targetUserId)

    return NextResponse.json({ member: memberWithUser })
  } catch (error) {
    console.error('Error fetching member:', error)
    return NextResponse.json(
      { error: 'Failed to fetch member' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/organization/[id]/members/[userId]
 * Update member role
 * Requires: Owner or Admin role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: organizationId, userId: targetUserId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const userProfile = await UserService.getUserByAuthId(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check permission
    const authResult = await requireOrgPermission(
      userProfile.id,
      organizationId,
      'canManageMembers'
    )

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Parse request body
    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['Owner', 'Admin', 'Attendance Taker', 'Member']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: Owner, Admin, Attendance Taker, or Member' },
        { status: 400 }
      )
    }

    // Get target member
    const targetMember = await OrganizationService.getMember(
      organizationId,
      targetUserId
    )

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent changing current owner's role unless transferring ownership
    const org = await OrganizationService.getOrganizationById(organizationId)
    if (org?.owner_user_id === targetUserId && role !== 'Owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role. Use transfer ownership endpoint instead.' },
        { status: 400 }
      )
    }

    // Only owner can assign Owner role
    if (role === 'Owner' && !authResult.isOwner) {
      return NextResponse.json(
        { error: 'Only the organization owner can assign Owner role' },
        { status: 403 }
      )
    }

    // Update role
    const updatedMember = await OrganizationService.updateMemberRole(
      organizationId,
      targetUserId,
      { role }
    )

    if (!updatedMember) {
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      )
    }

    // Get updated member with user details
    const members = await OrganizationService.getOrganizationMembers(
      organizationId
    )
    const memberWithUser = members.find((m) => m.user_id === targetUserId)

    return NextResponse.json({
      message: 'Member role updated successfully',
      member: memberWithUser,
    })
  } catch (error) {
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organization/[id]/members/[userId]
 * Remove member from organization
 * Requires: Owner or Admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: organizationId, userId: targetUserId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const userProfile = await UserService.getUserByAuthId(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check permission
    const authResult = await requireOrgPermission(
      userProfile.id,
      organizationId,
      'canManageMembers'
    )

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Get target member
    const targetMember = await OrganizationService.getMember(
      organizationId,
      targetUserId
    )

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot remove the owner
    const org = await OrganizationService.getOrganizationById(organizationId)
    if (org?.owner_user_id === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot remove the organization owner. Transfer ownership first.' },
        { status: 400 }
      )
    }

    // Remove member
    const success = await OrganizationService.removeMember(
      organizationId,
      targetUserId
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Member removed successfully',
    })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
