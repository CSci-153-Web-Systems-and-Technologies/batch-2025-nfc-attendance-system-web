import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { UserService } from '@/lib/services/user.service';

/**
 * GET /api/user/tag/can-write
 * Check if the current user can write a new tag
 * 
 * Authentication: Required
 * 
 * Response:
 * {
 *   can_write: boolean;
 *   next_available_date: string | null;
 *   last_write_date: string | null;
 *   cooldown_days: number;
 *   days_remaining?: number;
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

    // Check if user can write a new tag
    const result = await UserService.canWriteTag(user.id);

    // Calculate days remaining if cannot write
    if (!result.can_write && result.next_available_date) {
      const now = new Date();
      const nextAvailable = new Date(result.next_available_date);
      const daysRemaining = Math.ceil(
        (nextAvailable.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return NextResponse.json(
        {
          ...result,
          days_remaining: daysRemaining
        },
        { status: 200 }
      );
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('Error checking tag write eligibility:', error);

    return NextResponse.json(
      { error: 'Failed to check tag write eligibility' },
      { status: 500 }
    );
  }
}
