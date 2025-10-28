import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'

/**
 * POST /api/user/mark-password-set
 * Mark that the current user has set a password
 * Used when OAuth users set their first password
 */
export async function POST() {
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

    // Mark password as set
    const { success, error } = await UserService.markPasswordSet(authUser.id)

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success })
  } catch (error) {
    console.error('Error marking password as set:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
