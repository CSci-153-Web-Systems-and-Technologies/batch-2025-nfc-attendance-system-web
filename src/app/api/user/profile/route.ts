import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'

/**
 * GET /api/user/profile
 * Get current user's profile
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

    // Get user profile
    const user = await UserService.getUserByAuthId(authUser.id)

    if (!user) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/user/profile
 * Update current user's profile
 */
export async function PUT(request: NextRequest) {
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

    // Get user profile to get user ID
    const existingUser = await UserService.getUserByAuthId(authUser.id)
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, user_type, nfc_tag_id, qr_code_data } = body

    // Validate input
    if (name && typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid name' },
        { status: 400 }
      )
    }

    if (user_type && !['Student', 'Faculty', 'Admin'].includes(user_type)) {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      )
    }

    // Check if NFC tag is available
    if (nfc_tag_id) {
      const isAvailable = await UserService.isNfcTagAvailable(nfc_tag_id, existingUser.id)
      if (!isAvailable) {
        return NextResponse.json(
          { error: 'NFC tag already in use' },
          { status: 400 }
        )
      }
    }

    // Update user
    const { user, error } = await UserService.updateUser(existingUser.id, {
      name,
      user_type,
      nfc_tag_id,
      qr_code_data,
    })

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
