import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'
import type { UserType } from '@/types/user'

/**
 * POST /api/user/complete-profile
 * Create user profile for authenticated user
 */
export async function POST(request: NextRequest) {
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

    // Check if profile already exists
    const existingUser = await UserService.getUserById(authUser.id)
    if (existingUser) {
      return NextResponse.json(
        { error: 'Profile already exists' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, user_type, nfc_tag_id, qr_code_data } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!user_type || !['Student', 'Faculty', 'Admin'].includes(user_type)) {
      return NextResponse.json(
        { error: 'Valid user type is required (Student, Faculty, or Admin)' },
        { status: 400 }
      )
    }

    // Check if NFC tag is available (if provided)
    if (nfc_tag_id) {
      const isAvailable = await UserService.isNfcTagAvailable(nfc_tag_id)
      if (!isAvailable) {
        return NextResponse.json(
          { error: 'NFC tag already in use' },
          { status: 400 }
        )
      }
    }

    // Determine auth provider and password status
    const authProvider = UserService.getAuthProviderFromUser(authUser)
    const hasPassword = UserService.authUserHasPassword(authUser)

    // Create user profile with auth user ID as primary key
    const { user, error } = await UserService.createUser(authUser.id, {
      name: name.trim(),
      email: authUser.email!,
      user_type: user_type as UserType,
      auth_provider: authProvider,
      has_password: hasPassword,
      nfc_tag_id: nfc_tag_id || undefined,
      qr_code_data: qr_code_data || undefined,
    })

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      )
    }

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error completing profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
