import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { UserService } from '@/lib/services/user.service'
import { requireOrgOwner, isAuthorized } from '@/lib/authorization'

/**
 * POST /api/organization/[id]/transfer-ownership
 * Transfer ownership to another member
 * Requires: Owner role only
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

    // Verify user profile exists
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user is owner (use auth user ID directly)
    const authResult = await requireOrgOwner(user.id, organizationId)

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Parse request body
    const body = await request.json()
    const { new_owner_id } = body

    if (!new_owner_id) {
      return NextResponse.json(
        { error: 'new_owner_id is required' },
        { status: 400 }
      )
    }

    // Check if new owner is a member
    const newOwnerMember = await OrganizationService.getMember(
      organizationId,
      new_owner_id
    )

    if (!newOwnerMember) {
      return NextResponse.json(
        { error: 'New owner must be a member of the organization' },
        { status: 400 }
      )
    }

    // Cannot transfer to self
    if (new_owner_id === user.id) {
      return NextResponse.json(
        { error: 'You are already the owner' },
        { status: 400 }
      )
    }

    // Transfer ownership
    const success = await OrganizationService.transferOwnership(
      organizationId,
      new_owner_id
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to transfer ownership' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Ownership transferred successfully',
      new_owner_id,
    })
  } catch (error) {
    console.error('Error transferring ownership:', error)
    return NextResponse.json(
      { error: 'Failed to transfer ownership' },
      { status: 500 }
    )
  }
}
