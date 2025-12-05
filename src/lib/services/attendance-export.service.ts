import * as XLSX from 'xlsx'
import type { AttendanceWithUser, EventAttendanceSummary } from '@/types/attendance'

interface ExportOptions {
  eventName: string
  organizationName: string
  eventDate?: string
  attendees: AttendanceWithUser[]
  summary?: EventAttendanceSummary
}

/**
 * Generates an Excel file buffer from attendance data
 */
export function generateAttendanceExcel(options: ExportOptions): Uint8Array {
  const { eventName, organizationName, eventDate, attendees, summary } = options

  // Create a new workbook
  const workbook = XLSX.utils.book_new()

  // Summary sheet data
  const summaryData = [
    ['Event Attendance Report'],
    [],
    ['Organization', organizationName],
    ['Event Name', eventName],
    ['Event Date', eventDate || 'N/A'],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['Attendance Summary'],
    ['Total Attendees', attendees.length],
  ]

  // Add member/non-member breakdown if available
  if (summary) {
    summaryData.push(
      ['Member Attendees', summary.member_count || attendees.filter(a => a.is_member !== false).length],
      ['Guest Attendees', summary.non_member_count || attendees.filter(a => a.is_member === false).length]
    )
  } else {
    const memberCount = attendees.filter(a => a.is_member !== false).length
    const guestCount = attendees.filter(a => a.is_member === false).length
    summaryData.push(
      ['Member Attendees', memberCount],
      ['Guest Attendees', guestCount]
    )
  }

  // Add scan method breakdown
  const nfcCount = attendees.filter(a => a.scan_method === 'NFC').length
  const qrCount = attendees.filter(a => a.scan_method === 'QR').length
  const manualCount = attendees.filter(a => a.scan_method === 'Manual').length
  
  summaryData.push(
    [],
    ['Scan Method Breakdown'],
    ['NFC Scans', nfcCount],
    ['QR Scans', qrCount],
    ['Manual Entry', manualCount]
  )

  // Create summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  
  // Style the summary sheet - set column widths
  summarySheet['!cols'] = [
    { wch: 20 }, // Column A
    { wch: 40 }, // Column B
  ]

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  // Attendees sheet data
  const attendeesHeader = [
    'No.',
    'Name',
    'Email',
    'User Type',
    'Membership Status',
    'Scan Method',
    'Check-in Time',
  ]

  const attendeesData = attendees.map((attendee, index) => [
    index + 1,
    attendee.user.name,
    attendee.user.email,
    attendee.user.user_type,
    attendee.is_member === false ? 'Guest' : 'Member',
    attendee.scan_method,
    formatDateTime(attendee.marked_at),
  ])

  // Create attendees sheet
  const attendeesSheet = XLSX.utils.aoa_to_sheet([attendeesHeader, ...attendeesData])
  
  // Set column widths for attendees sheet
  attendeesSheet['!cols'] = [
    { wch: 5 },  // No.
    { wch: 25 }, // Name
    { wch: 35 }, // Email
    { wch: 15 }, // User Type
    { wch: 18 }, // Membership Status
    { wch: 12 }, // Scan Method
    { wch: 22 }, // Check-in Time
  ]

  XLSX.utils.book_append_sheet(workbook, attendeesSheet, 'Attendees')

  // Generate buffer as Uint8Array for Next.js Response compatibility
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  
  return new Uint8Array(buffer)
}

/**
 * Generates a filename for the Excel export
 * Format: [event_name]_Attendance_[YYYY-MM-DD].xlsx
 */
export function generateExportFilename(eventName: string): string {
  // Sanitize event name for filename
  const sanitizedName = eventName
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50) // Limit length

  const dateStr = new Date().toISOString().split('T')[0]
  
  return `${sanitizedName}_Attendance_${dateStr}.xlsx`
}

/**
 * Format date/time for display in Excel
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
