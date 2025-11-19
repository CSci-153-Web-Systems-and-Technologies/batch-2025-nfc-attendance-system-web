import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { AttendanceService } from '@/lib/services/attendance.service';
import type { MarkAttendanceInput } from '@/types/attendance';

/**
 * POST /api/attendance
 * Mark a user's attendance at an event
 * 
 * Authentication: Required (Attendance Taker, Admin, or Owner role)
 * 
 * Request Body:
 * {
 *   event_id: string;
 *   user_id: string;
 *   scan_method: 'NFC' | 'QR' | 'Manual';
 *   location_lat?: number;
 *   location_lng?: number;
 *   notes?: string;
 * }
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
    const body: MarkAttendanceInput = await request.json();

    // Validate required fields
    if (!body.event_id || !body.user_id || !body.scan_method) {
      return NextResponse.json(
        { error: 'Missing required fields: event_id, user_id, scan_method' },
        { status: 400 }
      );
    }

    // Validate scan_method
    if (!['NFC', 'QR', 'Manual'].includes(body.scan_method)) {
      return NextResponse.json(
        { error: 'Invalid scan_method. Must be NFC, QR, or Manual' },
        { status: 400 }
      );
    }

    // Validate location if provided
    if (body.location_lat !== undefined) {
      if (body.location_lat < -90 || body.location_lat > 90) {
        return NextResponse.json(
          { error: 'Invalid latitude. Must be between -90 and 90' },
          { status: 400 }
        );
      }
    }

    if (body.location_lng !== undefined) {
      if (body.location_lng < -180 || body.location_lng > 180) {
        return NextResponse.json(
          { error: 'Invalid longitude. Must be between -180 and 180' },
          { status: 400 }
        );
      }
    }

    // Mark attendance (permission check happens in database function)
    const result = await AttendanceService.markAttendance(user.id, body);

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('Error marking attendance:', error);

    // Handle specific error messages
    if (error.message.includes('already marked')) {
      return NextResponse.json(
        { error: 'Attendance already marked for this user at this event' },
        { status: 409 }
      );
    }

    if (error.message.includes('not a member')) {
      return NextResponse.json(
        { error: 'User is not a member of the organization' },
        { status: 403 }
      );
    }

    if (error.message.includes('does not have permission')) {
      return NextResponse.json(
        { error: 'You do not have permission to take attendance for this event' },
        { status: 403 }
      );
    }

    if (error.message.includes('Event not found')) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to mark attendance' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attendance?event_id={eventId}
 * Get attendance summary for an event
 * 
 * Authentication: Required (Organization member)
 * 
 * Query Parameters:
 * - event_id: string (required)
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

    // Get event_id from query parameters
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing required parameter: event_id' },
        { status: 400 }
      );
    }

    // Get attendance list (RLS will enforce permission check)
    const attendanceList = await AttendanceService.getEventAttendance(eventId);

    return NextResponse.json(attendanceList, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching attendance:', error);

    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}
