import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { AttendanceService } from '@/lib/services/attendance.service';

/**
 * GET /api/attendance/event/[id]
 * Get all attendance records for a specific event
 * 
 * Authentication: Required (Organization member)
 * 
 * Query Parameters:
 * - details: boolean (optional) - Include full details (default: false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: eventId } = await params;

    // Check if details are requested
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';

    if (includeDetails) {
      // Get attendance with full details
      const attendance = await AttendanceService.getAttendanceWithDetails(eventId);
      return NextResponse.json(attendance, { status: 200 });
    } else {
      // Get attendance list with summary
      const attendanceList = await AttendanceService.getEventAttendance(eventId);
      return NextResponse.json(attendanceList, { status: 200 });
    }

  } catch (error: any) {
    console.error('Error fetching event attendance:', error);

    return NextResponse.json(
      { error: 'Failed to fetch event attendance' },
      { status: 500 }
    );
  }
}
