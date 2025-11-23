import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { UserService } from '@/lib/services/user.service';

/**
 * POST /api/user/tag/prepare
 * Prepare a new tag for the current user (Phase 1 of two-phase commit)
 * Generates a temporary tag ID without committing to the user's active tag
 * 
 * Authentication: Required
 * 
 * Response:
 * {
 *   success: boolean;
 *   tag_id: string;          // The tag ID to write to NFC
 *   pending_id: string;      // ID needed for confirmation
 *   expires_at: string;      // When this preparation expires (5 minutes)
 * }
 * 
 * Flow:
 * 1. Call /api/user/tag/prepare to get a tag_id and pending_id
 * 2. Write the tag_id to the NFC tag
 * 3. If write succeeds, call /api/user/tag/confirm with pending_id
 * 4. If write fails, do nothing - the pending tag will expire
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

    // Prepare new tag (will throw error if cooldown not elapsed)
    const result = await UserService.prepareTag(user.id);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('Error preparing tag:', error);

    // Check if it's a cooldown error
    if (error.message.includes('Cooldown period not elapsed')) {
      // Extract next available date from error message
      const match = error.message.match(/Next available: (.+)/);
      const nextAvailable = match ? match[1] : 'unknown';

      return NextResponse.json(
        {
          error: 'Tag generation cooldown period not elapsed',
          message: error.message,
          next_available_date: nextAvailable
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to prepare tag' },
      { status: 500 }
    );
  }
}
