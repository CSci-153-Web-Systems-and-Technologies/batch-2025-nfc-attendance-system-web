/**
 * Tag Management Type Definitions
 * Defines types for NFC/QR tag generation and management
 */

// ============================================================================
// TAG INTERFACES
// ============================================================================

/**
 * Tag write history record
 */
export interface TagWriteRecord {
  id: string;
  user_id: string;
  tag_id: string;
  written_at: string;
  created_at: string;
}

/**
 * Response from can_user_write_tag function
 */
export interface CanWriteTagResponse {
  can_write: boolean;
  next_available_date: string | null;
  last_write_date: string | null;
  cooldown_days: number;
}

/**
 * Response from generate_and_assign_tag function
 */
export interface GenerateTagResponse {
  success: boolean;
  tag_id: string;
  write_record_id: string;
  written_at: string;
}

/**
 * Tag write history list response
 */
export interface TagWriteHistory {
  writes: TagWriteRecord[];
  total_writes: number;
}

// ============================================================================
// NFC INTERFACES
// ============================================================================

/**
 * NFC scan result
 */
export interface NFCScanResult {
  success: boolean;
  tag_id: string | null;
  error?: string;
}

/**
 * NFC write result
 */
export interface NFCWriteResult {
  success: boolean;
  tag_id: string;
  error?: string;
}

/**
 * NFC reader options
 */
export interface NFCReaderOptions {
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Web NFC API types (for browsers that support it)
 */
export interface NDEFMessage {
  records: NDEFRecord[];
}

export interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  data?: BufferSource;
  encoding?: string;
  lang?: string;
}

export interface NDEFReader {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  write(message: string | NDEFMessage, options?: { overwrite?: boolean; signal?: AbortSignal }): Promise<void>;
  onreading: ((event: NDEFReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
}

export interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: NDEFMessage;
}

// Extend Window interface for NFC support
declare global {
  interface Window {
    NDEFReader?: {
      new(): NDEFReader;
    };
  }
}

// ============================================================================
// QR CODE INTERFACES
// ============================================================================

/**
 * QR code generation options
 */
export interface QRCodeOptions {
  width?: number;
  height?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * QR code scan result
 */
export interface QRScanResult {
  success: boolean;
  tag_id: string | null;
  error?: string;
}

/**
 * QR code download options
 */
export interface QRDownloadOptions {
  filename?: string;
  format?: 'png' | 'jpeg' | 'svg';
  quality?: number;
}
