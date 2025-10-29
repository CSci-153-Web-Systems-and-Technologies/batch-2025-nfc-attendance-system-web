import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { UserService } from '@/lib/services/user.service'
import {
  requireOrgPermission,
  requireOrgOwner,
  requireOrgMembership,
  isAuthorized,
} from '@/lib/authorization'

/**
 * GET /api/organization/[id]
 * Get organization details with user's role
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

    // Verify user profile exists
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user is a member (use auth user ID directly)
    const authResult = await requireOrgMembership(user.id, organizationId)

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Get organization with role (use auth user ID directly)
    const organization = await OrganizationService.getOrganizationWithRole(
      organizationId,
      user.id
    )

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Error fetching organization:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/organization/[id]
 * Update organization details
 * Requires: Owner or Admin role
 */
export async function PUT(
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

    // Check permission (use auth user ID directly)
    const authResult = await requireOrgPermission(
      user.id,
      organizationId,
      'canManageOrganization'
    )

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Parse request body
    const body = await request.json()
    const { name, description } = body

    // Validate input
    const updateData: any = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid organization name' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    // Update organization
    const organization = await OrganizationService.updateOrganization(
      organizationId,
      updateData
    )

    if (!organization) {
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Organization updated successfully',
      organization,
    })
  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organization/[id]
 * Delete organization
 * Requires: Owner role only
 */
export async function DELETE(
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

    // Delete organization
    const success = await OrganizationService.deleteOrganization(organizationId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Organization deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    )
  }
}
