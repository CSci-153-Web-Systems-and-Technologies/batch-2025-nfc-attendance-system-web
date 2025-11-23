import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { UserService } from '@/lib/services/user.service';

/**
 * GET /api/user/tag/history
 * Get tag write history for the current user
 * 
 * Authentication: Required
 * 
 * Query Parameters:
 * - limit: number (optional, default: 10)
 * 
 * Response:
 * {
 *   writes: TagWriteRecord[];
 *   total_writes: number;
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

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get tag write history
    const writes = await UserService.getTagWriteHistory(user.id, limit);

    return NextResponse.json(
      {
        writes,
        total_writes: writes.length
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error fetching tag write history:', error);

    return NextResponse.json(
      { error: 'Failed to fetch tag write history' },
      { status: 500 }
    );
  }
}
