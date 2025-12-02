import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { generateAttendanceExcel, generateExportFilename } from '@/lib/services/attendance-export.service'
import type { AttendanceWithUser } from '@/types/attendance'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = await createClient()
    const { eventId } = await params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get event details with organization
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        date,
        organization_id,
        organizations!inner(
          id,
          name
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if user is Admin or Owner of the organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', event.organization_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      )
    }

    // Only Admin and Owner can export
    if (!['Admin', 'Owner'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only Admins and Owners can export attendance' },
        { status: 403 }
      )
    }

    // Fetch attendance records
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('event_attendance')
      .select(`
        id,
        user_id,
        event_id,
        marked_at,
        scan_method,
        is_member,
        user:users!event_attendance_user_id_fkey(
          id,
          name,
          email,
          user_type
        )
      `)
      .eq('event_id', eventId)
      .order('marked_at', { ascending: true })

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
      return NextResponse.json(
        { error: 'Failed to fetch attendance records' },
        { status: 500 }
      )
    }

    // Normalize attendance data
    const attendees: AttendanceWithUser[] = (attendanceData || []).map((record) => ({
      ...record,
      user: Array.isArray(record.user) ? record.user[0] : record.user,
      is_member: record.is_member ?? true,
    })) as AttendanceWithUser[]

    // Get organization name from the nested object
    const organization = Array.isArray(event.organizations) 
      ? event.organizations[0] 
      : event.organizations
    
    // Generate Excel file
    const excelBuffer = generateAttendanceExcel({
      eventName: event.title,
      organizationName: organization?.name || 'Unknown Organization',
      eventDate: event.date,
      attendees,
    })

    // Generate filename
    const filename = generateExportFilename(event.title)

    // Return Excel file - create a new Response with proper ArrayBuffer
    const arrayBuffer = excelBuffer.buffer.slice(excelBuffer.byteOffset, excelBuffer.byteOffset + excelBuffer.byteLength)
    
    return new NextResponse(arrayBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting attendance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
