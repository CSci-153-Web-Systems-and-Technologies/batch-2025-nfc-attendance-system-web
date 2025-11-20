import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { UserService } from '@/lib/services/user.service';

/**
 * GET /api/user/by-tag?tag_id={tagId}
 * Lookup a user by their tag ID (for NFC/QR scanning)
 * 
 * Authentication: Required
 * 
 * Query Parameters:
 * - tag_id: string (required)
 * 
 * Response:
 * {
 *   id: string;
 *   name: string;
 *   email: string;
 *   user_type: string;
 *   tag_id: string;
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tag_id from query parameters
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tag_id');

    if (!tagId) {
      return NextResponse.json(
        { error: 'Missing required parameter: tag_id' },
        { status: 400 }
      );
    }

    // Lookup user by tag
    const foundUser = await UserService.getUserByTag(tagId);

    if (!foundUser) {
      return NextResponse.json(
        { error: 'User not found with this tag' },
        { status: 404 }
      );
    }

    // Return limited user information (for security)
    return NextResponse.json(
      {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        user_type: foundUser.user_type,
        tag_id: foundUser.tag_id
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error looking up user by tag:', error);

    return NextResponse.json(
      { error: 'Failed to lookup user' },
      { status: 500 }
    );
  }
}
