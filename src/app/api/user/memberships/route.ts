import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

/**
 * GET /api/user/memberships
 * Get current user's organization memberships with organization details
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch user's memberships with organization details
    const { data: memberships, error: membershipsError } = await supabase
      .from('organization_members')
      .select(`
        role,
        organizations (
          id,
          name,
          tag
        )
      `)
      .eq('user_id', authUser.id)
      .order('joined_at', { ascending: false })

    if (membershipsError) {
      console.error('Error fetching memberships:', membershipsError)
      return NextResponse.json(
        { error: 'Failed to fetch memberships' },
        { status: 500 }
      )
    }

    // Transform the data to a simpler format
    const formattedMemberships = (memberships || []).map((membership: any) => ({
      role: membership.role,
      organization: membership.organizations
    }))

    return NextResponse.json({ 
      memberships: formattedMemberships,
      count: formattedMemberships.length
    })
  } catch (error) {
    console.error('Error fetching user memberships:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
