import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { EventService } from '@/lib/services/event.service'
import { UserService } from '@/lib/services/user.service'
import type { CreateEventInput, EventFilters } from '@/types/event'

// GET /api/event - Get all events for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to get user ID
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userId = userProfile.id

    const { searchParams } = new URL(request.url)
    const filters: EventFilters = {}

    // Parse query parameters
    if (searchParams.get('organization_id')) {
      filters.organization_id = searchParams.get('organization_id') as string
    }
    if (searchParams.get('from_date')) {
      filters.from_date = searchParams.get('from_date') as string
    }
    if (searchParams.get('to_date')) {
      filters.to_date = searchParams.get('to_date') as string
    }
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search') as string
    }

    // Check for special query types
    const upcoming = searchParams.get('upcoming') === 'true'
    const past = searchParams.get('past') === 'true'
    const ongoing = searchParams.get('ongoing') === 'true'
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit') as string)
      : 10
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset') as string)
      : 0
    const organizationId = filters.organization_id

    let result
    if (upcoming) {
      result = await EventService.getUpcomingEvents(userId, limit, organizationId, offset)
    } else if (past) {
      result = await EventService.getPastEvents(userId, limit, offset)
    } else if (ongoing) {
      result = await EventService.getOngoingEvents(userId, limit, organizationId, offset)
    } else {
      const events = await EventService.getUserEvents(userId, filters)
      result = { events, total: events.length }
    }

    return NextResponse.json({
      events: result.events,
      pagination: {
        total: result.total,
        offset,
        limit,
        has_more: offset + result.events.length < result.total,
      },
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

// POST /api/event - Create a new event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to get user ID
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userId = userProfile.id

    // Check if request contains files (multipart/form-data) or just JSON
    const contentType = request.headers.get('content-type') || ''
    const isMultipart = contentType.includes('multipart/form-data')

    let body: any
    let files: File[] = []
    let featuredImage: File | null = null

    if (isMultipart) {
      const formData = await request.formData()
      body = JSON.parse(formData.get('data') as string)
      files = formData.getAll('files') as File[]
      const featuredImageFile = formData.get('featuredImage')
      if (featuredImageFile instanceof File) {
        featuredImage = featuredImageFile
      }
    } else {
      body = await request.json()
    }

    const input: CreateEventInput = {
      event_name: body.event_name,
      date: body.date,
      organization_id: body.organization_id,
      description: body.description,
      location: body.location,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      attendance_radius_meters: body.attendance_radius_meters ?? null,
      event_start: body.event_start,
      event_end: body.event_end,
    }

    // Validate required fields
    if (!input.event_name || !input.date || !input.organization_id) {
      return NextResponse.json(
        { error: 'Missing required fields: event_name, date, organization_id' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateObj = new Date(input.date)
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // Validate attendance_radius_meters if provided
    if (input.attendance_radius_meters !== undefined && input.attendance_radius_meters !== null) {
      if (
        typeof input.attendance_radius_meters !== 'number' ||
        input.attendance_radius_meters < 100 ||
        input.attendance_radius_meters > 1000
      ) {
        return NextResponse.json(
          { error: 'attendance_radius_meters must be between 100 and 1000' },
          { status: 400 }
        )
      }
      // Require latitude/longitude when radius restriction is set
      if (input.latitude == null || input.longitude == null) {
        return NextResponse.json(
          { error: 'latitude and longitude are required when attendance radius is set' },
          { status: 400 }
        )
      }
    }

    // Validate event_start and event_end if provided
    if (input.event_start) {
      const eventStartObj = new Date(input.event_start)
      if (isNaN(eventStartObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid event_start date format' },
          { status: 400 }
        )
      }
    }

    if (input.event_end) {
      const eventEndObj = new Date(input.event_end)
      if (isNaN(eventEndObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid event_end date format' },
          { status: 400 }
        )
      }
    }

    // Validate file count
    if (files.length > 10) {
      return NextResponse.json(
        { error: `Cannot upload more than 10 files. Received ${files.length} files.` },
        { status: 400 }
      )
    }

    // Validate files
    const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ]

    const fileValidationErrors: { fileName: string; error: string }[] = []
    const validFiles: File[] = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        fileValidationErrors.push({
          fileName: file.name,
          error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 20MB limit`,
        })
        continue
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        fileValidationErrors.push({
          fileName: file.name,
          error: `File type ${file.type} not allowed`,
        })
        continue
      }
      validFiles.push(file)
    }

    // Validate featured image
    if (featuredImage) {
      if (featuredImage.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Featured image size ${(featuredImage.size / 1024 / 1024).toFixed(2)}MB exceeds 20MB limit` },
          { status: 400 }
        )
      }
      if (!['image/jpeg', 'image/png'].includes(featuredImage.type)) {
        return NextResponse.json(
          { error: 'Featured image must be JPEG or PNG' },
          { status: 400 }
        )
      }
    }

    // Create event first
    const event = await EventService.createEvent(userId, input)

    if (!event) {
      return NextResponse.json(
        { error: 'Failed to create event. Check permissions.' },
        { status: 403 }
      )
    }

    // Upload featured image if provided
    if (featuredImage) {
      const timestamp = Date.now()
      const sanitizedFileName = featuredImage.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${input.organization_id}/${event.id}/featured/${timestamp}-${sanitizedFileName}`

      const { error: uploadError } = await supabase.storage
        .from('event-files')
        .upload(storagePath, featuredImage, {
          contentType: featuredImage.type,
          upsert: false,
        })

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('event-files')
          .getPublicUrl(storagePath)

        // Update event with featured image URL
        await supabase
          .from('events')
          .update({
            featured_image_url: publicUrl,
            featured_image_storage_path: storagePath,
          })
          .eq('id', event.id)
      }
    }

    // Upload additional files if provided
    const uploadedFiles = []
    const uploadErrors = []

    for (const file of validFiles) {
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${input.organization_id}/${event.id}/${timestamp}-${sanitizedFileName}`

      const { error: storageError } = await supabase.storage
        .from('event-files')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (storageError) {
        uploadErrors.push({
          fileName: file.name,
          error: storageError.message,
        })
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('event-files')
        .getPublicUrl(storagePath)

      const fileType = file.type.startsWith('image/') ? 'image' : 'document'

      const { data: fileRecord, error: dbError } = await supabase
        .from('event_files')
        .insert({
          event_id: event.id,
          file_name: file.name,
          file_url: publicUrl,
          storage_path: storagePath,
          file_type: fileType,
          file_size_bytes: file.size,
          mime_type: file.type,
          uploaded_by: userId,
        })
        .select()
        .single()

      if (dbError) {
        await supabase.storage.from('event-files').remove([storagePath])
        uploadErrors.push({
          fileName: file.name,
          error: dbError.message,
        })
        continue
      }

      uploadedFiles.push(fileRecord)
    }

    return NextResponse.json(
      {
        ...event,
        uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
        fileValidationErrors: fileValidationErrors.length > 0 ? fileValidationErrors : undefined,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}
