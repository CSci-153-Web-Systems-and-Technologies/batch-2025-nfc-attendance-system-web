/**
 * Attendance Type Definitions
 * Defines types for event attendance tracking system
 */

import type { ScanMethod } from '../lib/constants';

// ============================================================================
// ATTENDANCE INTERFACES
// ============================================================================

/**
 * Base attendance record
 */
export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  marked_at: string;
  marked_by: string;
  scan_method: ScanMethod;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Attendance record with attendee user details
 */
export interface AttendanceWithUser extends Attendance {
  user: {
    id: string;
    name: string;
    email: string;
    user_type: string;
  };
}

/**
 * Attendance record with complete details (user, event, marker, organization)
 */
export interface AttendanceWithDetails extends Attendance {
  user_name: string;
  user_email: string;
  user_type: string;
  event_name: string;
  event_date: string;
  event_location: string | null;
  organization_id: string;
  organization_name: string;
  marked_by_name: string;
  marked_by_email: string;
}

/**
 * Input for marking attendance
 */
export interface MarkAttendanceInput {
  event_id: string;
  user_id: string;
  scan_method: ScanMethod;
  location_lat?: number;
  location_lng?: number;
  notes?: string;
}

/**
 * Response from mark attendance operation
 */
export interface MarkAttendanceResponse {
  success: boolean;
  attendance_id: string;
  marked_at: string;
}

// ============================================================================
// ATTENDANCE SUMMARY INTERFACES
// ============================================================================

/**
 * Summary of attendance for an event
 */
export interface EventAttendanceSummary {
  event_id: string;
  event_name: string;
  event_date: string;
  organization_id: string;
  organization_name: string;
  total_attended: number;
  total_members: number;
  attendance_percentage: number;
  nfc_scans: number;
  qr_scans: number;
  manual_entries: number;
  last_attendance_marked: string | null;
}

/**
 * User's attendance statistics for an organization
 */
export interface UserAttendanceStats {
  user_id: string;
  user_name: string;
  user_email: string;
  organization_id: string;
  organization_name: string;
  total_events: number;
  events_attended: number;
  events_missed: number;
  attendance_rate: number;
}

/**
 * Attendance list with attendees
 */
export interface EventAttendanceList {
  event_id: string;
  total_attended: number;
  total_members: number;
  attendance_rate: number;
  attendees: AttendanceWithUser[];
}

// ============================================================================
// REALTIME INTERFACES
// ============================================================================

/**
 * Realtime attendance update payload
 */
export interface AttendanceRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Attendance | null;
  old: Attendance | null;
}

/**
 * Realtime channel subscription config
 */
export interface AttendanceRealtimeConfig {
  event_id: string;
  onInsert?: (attendance: Attendance) => void;
  onUpdate?: (attendance: Attendance) => void;
  onDelete?: (attendance: Attendance) => void;
}
