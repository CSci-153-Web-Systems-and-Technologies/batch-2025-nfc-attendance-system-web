/**
 * Application-wide Constants
 * These constants are used across both frontend and backend
 */

// ============================================================================
// TAG MANAGEMENT CONSTANTS
// ============================================================================

/**
 * Number of days a user must wait before they can write a new tag
 * This prevents abuse of the tag generation system
 * 
 * DEVELOPER NOTE: To modify this limit, change this value
 * Also update the corresponding value in database functions if needed
 */
export const TAG_WRITE_COOLDOWN_DAYS = 14;

/**
 * Tag ID format validation regex
 * Currently accepts UUIDs in standard format
 */
export const TAG_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// ATTENDANCE CONSTANTS
// ============================================================================

/**
 * Valid scan methods for marking attendance
 */
export const SCAN_METHODS = ['NFC', 'QR', 'Manual'] as const;
export type ScanMethod = typeof SCAN_METHODS[number];

/**
 * Maximum distance (in meters) allowed for geolocation-based attendance
 * Set to null to disable geolocation validation
 */
export const MAX_ATTENDANCE_DISTANCE_METERS: number | null = null;

/**
 * Time window (in hours) before/after event start time that attendance can be marked
 * Set to null to allow attendance marking at any time
 */
export const ATTENDANCE_TIME_WINDOW_HOURS: number | null = null;

// ============================================================================
// QR CODE CONSTANTS
// ============================================================================

/**
 * QR code size for display and generation (in pixels)
 */
export const QR_CODE_SIZE = 300;

/**
 * QR code error correction level
 * L: ~7% correction, M: ~15%, Q: ~25%, H: ~30%
 */
export const QR_CODE_ERROR_CORRECTION: 'L' | 'M' | 'Q' | 'H' = 'M';

// ============================================================================
// NFC CONSTANTS
// ============================================================================

/**
 * NFC NDEF record type for attendance tags
 */
export const NFC_RECORD_TYPE = 'text';

/**
 * NFC tag timeout (in milliseconds)
 */
export const NFC_SCAN_TIMEOUT_MS = 10000;
