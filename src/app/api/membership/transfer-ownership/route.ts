import { NextResponse } from 'next/server'
import { MembershipService } from '@/lib/services/membership.service'
import { createClient } from '@/lib/server'

/**
 * POST /api/membership/transfer-ownership
 * Transfer organization ownership to another member
 * Body: { organization_id, new_owner_id }
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
    const { organization_id, new_owner_id } = body

    if (!organization_id || !new_owner_id) {
      return NextResponse.json(
        { error: 'Missing required fields: organization_id, new_owner_id' },
        { status: 400 }
      )
    }

    // Check if requesting user is the current owner
    const isOwner = await MembershipService.userHasRole(
      user.id,
      organization_id,
      'Owner'
    )

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: Only the current Owner can transfer ownership' },
        { status: 403 }
      )
    }

    // Check if new owner is a member of the organization
    const newOwnerMembership =
      await MembershipService.getUserMembershipInOrganization(
        new_owner_id,
        organization_id
      )

    if (!newOwnerMembership) {
      return NextResponse.json(
        { error: 'New owner must be a member of the organization' },
        { status: 400 }
      )
    }

    // Transfer ownership
    const success = await MembershipService.transferOwnership(
      organization_id,
      user.id,
      new_owner_id
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to transfer ownership' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Ownership transferred successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error transferring ownership:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
