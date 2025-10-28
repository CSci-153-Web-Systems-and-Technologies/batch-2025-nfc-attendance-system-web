import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { UserService } from '@/lib/services/user.service'

/**
 * GET /api/organization
 * Get all organizations where the current user is a member
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to get user ID
    const userProfile = await UserService.getUserByAuthId(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get all organizations user is a member of
    const organizations = await OrganizationService.getUserOrganizations(
      userProfile.id
    )

    return NextResponse.json({
      organizations,
      count: organizations.length,
    })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organization
 * Create a new organization
 */
export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const body = await request.json()
    const { name, description } = body

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }

    // Create organization
    const organization = await OrganizationService.createOrganization(
      userProfile.id,
      {
        name: name.trim(),
        description: description?.trim() || undefined,
      }
    )

    if (!organization) {
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Organization created successfully',
        organization: {
          ...organization,
          user_role: 'Owner',
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
