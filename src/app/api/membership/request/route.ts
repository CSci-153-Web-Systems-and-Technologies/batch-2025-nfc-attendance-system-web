import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'

/**
 * POST /api/membership/request
 * Request to join an organization
 * Creates a pending join request that requires admin/owner approval
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

    // Verify user profile exists
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { organization_id } = body

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Check if organization exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, tag')
      .eq('id', organization_id)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { 
          error: 'You are already a member of this organization',
          membership: existingMember 
        },
        { status: 400 }
      )
    }

    // Check if user already has a pending request
    const { data: existingRequest } = await supabase
      .from('organization_join_requests')
      .select('id, status')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { 
          error: 'You already have a pending request for this organization',
          request: existingRequest 
        },
        { status: 400 }
      )
    }

    // Create join request
    const { data: joinRequest, error: requestError } = await supabase
      .from('organization_join_requests')
      .insert({
        organization_id,
        user_id: user.id,
        status: 'pending',
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating join request:', requestError)
      return NextResponse.json(
        { error: 'Failed to create join request' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Join request submitted successfully. Waiting for admin approval.',
        request: joinRequest,
        organization: org,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in membership request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
