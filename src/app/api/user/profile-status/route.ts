import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'

/**
 * GET /api/user/profile-status
 * Check if current authenticated user has a profile
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { hasProfile: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has a profile
    const hasProfile = await UserService.hasProfile(authUser.id)

    return NextResponse.json({ 
      hasProfile,
      authId: authUser.id,
      email: authUser.email 
    })
  } catch (error) {
    console.error('Error checking profile status:', error)
    return NextResponse.json(
      { hasProfile: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
