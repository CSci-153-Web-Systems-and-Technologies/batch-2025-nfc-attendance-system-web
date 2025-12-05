import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { AttendanceService } from '@/lib/services/attendance.service';

/**
 * DELETE /api/attendance/[id]
 * Delete an attendance record (for corrections)
 * 
 * Authentication: Required (Admin or Owner role)
 */
export async function DELETE(
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

    const { id: attendanceId } = await params;

    // Delete attendance (RLS will enforce permission check)
    const result = await AttendanceService.deleteAttendance(attendanceId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Attendance record deleted' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error deleting attendance:', error);

    return NextResponse.json(
      { error: 'Failed to delete attendance record' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/attendance/[id]
 * Update an attendance record (for corrections)
 * 
 * Authentication: Required (Admin or Owner role)
 * 
 * Request Body:
 * {
 *   scan_method?: 'NFC' | 'QR' | 'Manual';
 *   location_lat?: number;
 *   location_lng?: number;
 *   notes?: string;
 * }
 */
export async function PATCH(
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

    const { id: attendanceId } = await params;

    // Parse request body
    const body = await request.json();

    // Validate scan_method if provided
    if (body.scan_method && !['NFC', 'QR', 'Manual'].includes(body.scan_method)) {
      return NextResponse.json(
        { error: 'Invalid scan_method. Must be NFC, QR, or Manual' },
        { status: 400 }
      );
    }

    // Update attendance (RLS will enforce permission check)
    const result = await AttendanceService.updateAttendance(attendanceId, user.id, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Attendance record updated' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error updating attendance:', error);

    return NextResponse.json(
      { error: 'Failed to update attendance record' },
      { status: 500 }
    );
  }
}
