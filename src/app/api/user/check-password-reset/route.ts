import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user.service'

/**
 * POST /api/user/check-password-reset
 * Check if a user can reset their password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user can reset password
    const result = await UserService.canResetPassword(email)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error checking password reset capability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
