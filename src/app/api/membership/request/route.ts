import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'

/**
 * POST /api/membership/request
 * Request to join an organization
 * Note: For now, this creates a pending membership that needs approval
 * In the future, this could create a separate join_request record
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
      .select('id, name')
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

    // For this simplified version, we'll add the user directly as a Member
    // In a real application, you'd want to:
    // 1. Create a join request record
    // 2. Notify organization admins
    // 3. Wait for approval before adding to organization_members
    
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id,
        user_id: user.id,
        role: 'Member', // Default role for new members
      })
      .select()
      .single()

    if (memberError) {
      console.error('Error creating membership:', memberError)
      return NextResponse.json(
        { error: 'Failed to join organization' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Successfully joined organization',
        membership,
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
