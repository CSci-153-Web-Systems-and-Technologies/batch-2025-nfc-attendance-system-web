import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { UserService } from '@/lib/services/user.service'
import { requireOrgPermission, isAuthorized } from '@/lib/authorization'

/**
 * GET /api/organization/[id]/members
 * Get all members of an organization
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

    // Get user profile
    const userProfile = await UserService.getUserByAuthId(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user can view members (any member can view)
    const authResult = await requireOrgPermission(
      userProfile.id,
      organizationId,
      'canViewAttendance' // All roles have this permission
    )

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Get all members
    const members = await OrganizationService.getOrganizationMembers(
      organizationId
    )

    return NextResponse.json({
      members,
      count: members.length,
    })
  } catch (error) {
    console.error('Error fetching organization members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organization/[id]/members
 * Add a new member to an organization
 * Requires: Owner or Admin role
 */
export async function POST(
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
    const { user_id, role, email } = body

    // Validate input - either user_id or email must be provided
    if (!user_id && !email) {
      return NextResponse.json(
        { error: 'Either user_id or email is required' },
        { status: 400 }
      )
    }

    // If email provided, look up user
    let targetUserId = user_id
    if (email && !user_id) {
      const targetUser = await UserService.getUserByEmail(email)
      if (!targetUser) {
        return NextResponse.json(
          { error: 'User with this email not found' },
          { status: 404 }
        )
      }
      targetUserId = targetUser.id
    }

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

    // Check if user is already a member
    const existingMember = await OrganizationService.getMember(
      organizationId,
      targetUserId
    )

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 409 }
      )
    }

    // Only owner can add other owners
    if (role === 'Owner' && !authResult.isOwner) {
      return NextResponse.json(
        { error: 'Only the organization owner can add other owners' },
        { status: 403 }
      )
    }

    // Add member
    const member = await OrganizationService.addMember(organizationId, {
      user_id: targetUserId,
      role,
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Failed to add member' },
        { status: 500 }
      )
    }

    // Get member with user details
    const members = await OrganizationService.getOrganizationMembers(
      organizationId
    )
    const memberWithUser = members.find((m) => m.user_id === targetUserId)

    return NextResponse.json(
      {
        message: 'Member added successfully',
        member: memberWithUser,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error adding member:', error)
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    )
  }
}
