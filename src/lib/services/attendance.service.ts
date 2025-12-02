import { createClient } from '@/lib/server';
import { haversineDistanceMeters } from '@/lib/utils';
import type {
  Attendance,
  AttendanceWithUser,
  AttendanceWithDetails,
  MarkAttendanceInput,
  MarkAttendanceResponse,
  EventAttendanceSummary,
  EventAttendanceList,
  UserAttendanceStats
} from '@/types/attendance';

export class AttendanceService {
  /**
   * Mark a user's attendance at an event
   * @param markedBy - UUID of user marking the attendance (must be Attendance Taker+)
   * @param input - Attendance marking input
   */
  static async markAttendance(
    markedBy: string,
    input: MarkAttendanceInput
  ): Promise<MarkAttendanceResponse> {
    const supabase = await createClient();

    // First, fetch the event to check attendance window
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('event_start, event_end, event_name, latitude, longitude, attendance_radius_meters')
      .eq('id', input.event_id)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw new Error('Event not found');
    }

    // Check if attendance is within the allowed time window
        // Geolocation restriction: if event has attendance_radius_meters set
        if (event.attendance_radius_meters && event.latitude && event.longitude) {
          // Require client provided coordinates
          if (input.location_lat == null || input.location_lng == null) {
            throw new Error('Location required: enable device location to mark attendance for this event');
          }
          // Compute distance (meters)
          const distanceMeters = haversineDistanceMeters(
            event.latitude,
            event.longitude,
            input.location_lat,
            input.location_lng
          );
          if (distanceMeters > event.attendance_radius_meters) {
            throw new Error(`You are outside the allowed attendance radius (${event.attendance_radius_meters}m). Distance: ${Math.round(distanceMeters)}m`);
          }
        }
    if (event.event_start && event.event_end) {
      const now = new Date();
      const startTime = new Date(event.event_start);
      const endTime = new Date(event.event_end);

      if (now < startTime) {
        // Format the start time in a user-friendly way
        const formattedStartTime = startTime.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        throw new Error(
          `Attendance has not started yet. Please try again after ${formattedStartTime}`
        );
      }

      if (now > endTime) {
        // Format the end time in a user-friendly way
        const formattedEndTime = endTime.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        throw new Error(
          `Attendance period has ended. The deadline was ${formattedEndTime}`
        );
      }
    }

    const { data, error } = await supabase.rpc('mark_attendance', {
      p_event_id: input.event_id,
      p_user_id: input.user_id,
      p_marked_by: markedBy,
      p_scan_method: input.scan_method,
      p_location_lat: input.location_lat || null,
      p_location_lng: input.location_lng || null,
      p_notes: input.notes || null
    });

    if (error) {
      console.error('Error marking attendance:', error);
      
      // Check for specific error messages
      if (error.message.includes('already marked')) {
        throw new Error('Attendance already marked for this user at this event');
      }
      if (error.message.includes('does not have permission')) {
        throw new Error('You do not have permission to take attendance for this event');
      }
      if (error.message.includes('Event not found')) {
        throw new Error('Event not found');
      }
      
      throw new Error('Failed to mark attendance');
    }

    return data as MarkAttendanceResponse;
  }

  /**
   * Get all attendance records for an event
   * @param eventId - UUID of the event
   */
  static async getEventAttendance(eventId: string): Promise<EventAttendanceList> {
    const supabase = await createClient();

    // Get attendance records with user details
    const { data: attendees, error: attendeesError } = await supabase
      .from('attendance_with_details')
      .select('*')
      .eq('event_id', eventId)
      .order('marked_at', { ascending: false });

    if (attendeesError) {
      console.error('Error fetching event attendance:', attendeesError);
      throw new Error('Failed to fetch event attendance');
    }

    // Get attendance summary
    const summary = await this.getEventAttendanceSummary(eventId);

    // Transform to AttendanceWithUser format
    const attendanceWithUsers: AttendanceWithUser[] = (attendees || []).map(record => ({
      id: record.id,
      event_id: record.event_id,
      user_id: record.user_id,
      marked_at: record.marked_at,
      marked_by: record.marked_by,
      scan_method: record.scan_method,
      location_lat: record.location_lat,
      location_lng: record.location_lng,
      notes: record.notes,
      is_member: record.is_member ?? true, // Default to true for existing records
      created_at: record.created_at,
      updated_at: record.updated_at,
      user: {
        id: record.user_id,
        name: record.user_name,
        email: record.user_email,
        user_type: record.user_type
      }
    }));

    return {
      event_id: eventId,
      total_attended: summary.total_attended,
      total_members: summary.total_members,
      attendance_rate: summary.attendance_percentage,
      attendees: attendanceWithUsers
    };
  }

  /**
   * Get attendance summary/statistics for an event
   * @param eventId - UUID of the event
   */
  static async getEventAttendanceSummary(eventId: string): Promise<EventAttendanceSummary> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_attendance_summary')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      console.error('Error fetching attendance summary:', error);
      throw new Error('Failed to fetch attendance summary');
    }

    return data as EventAttendanceSummary;
  }

  /**
   * Get attendance count for an event
   * @param eventId - UUID of the event
   */
  static async getEventAttendanceCount(eventId: string): Promise<number> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_event_attendance_count', {
      p_event_id: eventId
    });

    if (error) {
      console.error('Error getting attendance count:', error);
      return 0;
    }

    return data as number;
  }

  /**
   * Check if a user has attended a specific event
   * @param eventId - UUID of the event
   * @param userId - UUID of the user
   */
  static async isUserAttended(eventId: string, userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('is_user_attended', {
      p_event_id: eventId,
      p_user_id: userId
    });

    if (error) {
      console.error('Error checking attendance:', error);
      return false;
    }

    return data as boolean;
  }

  /**
   * Check if a user can take attendance for an event
   * @param eventId - UUID of the event
   * @param userId - UUID of the user
   */
  static async canTakeAttendance(eventId: string, userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('can_take_attendance', {
      p_event_id: eventId,
      p_user_id: userId
    });

    if (error) {
      console.error('Error checking attendance permission:', error);
      return false;
    }

    return data as boolean;
  }

  /**
   * Get user's attendance history
   * @param userId - UUID of the user
   * @param organizationId - Optional: filter by organization
   */
  static async getUserAttendanceHistory(
    userId: string,
    organizationId?: string
  ): Promise<Attendance[]> {
    const supabase = await createClient();

    let query = supabase
      .from('event_attendance')
      .select('*')
      .eq('user_id', userId)
      .order('marked_at', { ascending: false });

    if (organizationId) {
      // Join with events to filter by organization
      query = supabase
        .from('attendance_with_details')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .order('marked_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user attendance history:', error);
      return [];
    }

    return data as Attendance[];
  }

  /**
   * Get user's attendance statistics for an organization
   * @param userId - UUID of the user
   * @param organizationId - UUID of the organization
   */
  static async getUserAttendanceStats(
    userId: string,
    organizationId: string
  ): Promise<UserAttendanceStats | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_attendance_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching user attendance stats:', error);
      return null;
    }

    return data as UserAttendanceStats;
  }

  /**
   * Delete an attendance record (for corrections)
   * Requires Admin or Owner permission
   * @param attendanceId - UUID of the attendance record
   * @param userId - UUID of user requesting deletion (for permission check)
   */
  static async deleteAttendance(
    attendanceId: string,
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createClient();

    // The RLS policy will handle permission check
    const { error } = await supabase
      .from('event_attendance')
      .delete()
      .eq('id', attendanceId);

    if (error) {
      console.error('Error deleting attendance:', error);
      
      if (error.code === 'PGRST301') {
        return {
          success: false,
          error: 'You do not have permission to delete this attendance record'
        };
      }
      
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }

  /**
   * Update an attendance record (for corrections)
   * Requires Admin or Owner permission
   * @param attendanceId - UUID of the attendance record
   * @param userId - UUID of user requesting update
   * @param updates - Fields to update
   */
  static async updateAttendance(
    attendanceId: string,
    userId: string,
    updates: {
      scan_method?: 'NFC' | 'QR' | 'Manual';
      location_lat?: number | null;
      location_lng?: number | null;
      notes?: string | null;
    }
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createClient();

    // The RLS policy will handle permission check
    const { error } = await supabase
      .from('event_attendance')
      .update(updates)
      .eq('id', attendanceId);

    if (error) {
      console.error('Error updating attendance:', error);
      
      if (error.code === 'PGRST301') {
        return {
          success: false,
          error: 'You do not have permission to update this attendance record'
        };
      }
      
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }

  /**
   * Get all attendance records with full details
   * @param eventId - UUID of the event
   */
  static async getAttendanceWithDetails(eventId: string): Promise<AttendanceWithDetails[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('attendance_with_details')
      .select('*')
      .eq('event_id', eventId)
      .order('marked_at', { ascending: false });

    if (error) {
      console.error('Error fetching attendance details:', error);
      return [];
    }

    return data as AttendanceWithDetails[];
  }

  /**
   * Get attendance statistics for multiple events
   * @param eventIds - Array of event UUIDs
   */
  static async getBulkAttendanceSummary(
    eventIds: string[]
  ): Promise<Map<string, EventAttendanceSummary>> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_attendance_summary')
      .select('*')
      .in('event_id', eventIds);

    if (error) {
      console.error('Error fetching bulk attendance summary:', error);
      return new Map();
    }

    const summaryMap = new Map<string, EventAttendanceSummary>();
    (data || []).forEach(summary => {
      summaryMap.set(summary.event_id, summary as EventAttendanceSummary);
    });

    return summaryMap;
  }
}
