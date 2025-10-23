import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'

/**
 * GET /api/user/by-nfc?tag=<nfc_tag_id>
 * Get user by NFC tag ID (for attendance scanning)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get NFC tag from query params
    const searchParams = request.nextUrl.searchParams
    const nfcTagId = searchParams.get('tag')

    if (!nfcTagId) {
      return NextResponse.json(
        { error: 'NFC tag ID is required' },
        { status: 400 }
      )
    }

    // Get user by NFC tag
    const user = await UserService.getUserByNfcTag(nfcTagId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found with this NFC tag' },
        { status: 404 }
      )
    }

    // Return user profile (without sensitive data)
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
      }
    })
  } catch (error) {
    console.error('Error fetching user by NFC:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
