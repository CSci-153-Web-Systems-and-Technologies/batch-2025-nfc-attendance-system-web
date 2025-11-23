import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { UserService } from '@/lib/services/user.service';

/**
 * POST /api/user/tag/confirm
 * Confirm a pending tag write (Phase 2 of two-phase commit)
 * Only call this after successfully writing the tag to NFC
 * 
 * Authentication: Required
 * 
 * Request Body:
 * {
 *   pending_id: string;  // The pending_id from prepare response
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   tag_id: string;
 *   write_record_id: string;
 *   written_at: string;
 * }
 * 
 * Error Cases:
 * - Pending tag expired (5 minutes passed)
 * - Invalid pending_id
 * - Tag already confirmed
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { pending_id } = body;

    if (!pending_id) {
      return NextResponse.json(
        { error: 'Missing required field: pending_id' },
        { status: 400 }
      );
    }

    // Confirm the tag write
    const result = await UserService.confirmTag(user.id, pending_id);

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('Error confirming tag:', error);

    // Handle specific error cases
    if (error.message.includes('expired')) {
      return NextResponse.json(
        {
          error: 'Tag preparation expired',
          message: 'The tag preparation has expired. Please generate a new tag.'
        },
        { status: 410 } // 410 Gone
      );
    }

    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      return NextResponse.json(
        {
          error: 'Invalid pending tag',
          message: 'The pending tag ID is invalid or does not belong to you.'
        },
        { status: 404 }
      );
    }

    if (error.message.includes('already confirmed')) {
      return NextResponse.json(
        {
          error: 'Tag already confirmed',
          message: 'This tag has already been confirmed.'
        },
        { status: 409 } // 409 Conflict
      );
    }

    return NextResponse.json(
      { error: 'Failed to confirm tag write' },
      { status: 500 }
    );
  }
}
