import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { EventService } from '@/lib/services/event.service'
import { UserService } from '@/lib/services/user.service'
import type { UpdateEventInput } from '@/types/event'

// GET /api/event/[id] - Get a specific event by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user profile exists
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { id } = await params

    // Check if details are requested
    const { searchParams } = new URL(request.url)
    const includeDetails = searchParams.get('details') === 'true'

    let event
    if (includeDetails) {
      event = await EventService.getEventWithDetails(user.id, id)
    } else {
      event = await EventService.getEventById(user.id, id)
    }

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

// PUT /api/event/[id] - Update an event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user profile exists
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { id } = await params

    // Check if request contains files (multipart/form-data) or just JSON
    const contentType = request.headers.get('content-type') || ''
    const isMultipart = contentType.includes('multipart/form-data')

    let body: any
    let newFeaturedImage: File | null = null
    let removeFeaturedImage = false

    if (isMultipart) {
      const formData = await request.formData()
      body = JSON.parse(formData.get('data') as string)
      const featuredImageFile = formData.get('featuredImage')
      if (featuredImageFile instanceof File) {
        newFeaturedImage = featuredImageFile
      }
      removeFeaturedImage = formData.get('removeFeaturedImage') === 'true'
    } else {
      body = await request.json()
    }

    const input: UpdateEventInput = {
      event_name: body.event_name,
      date: body.date,
      description: body.description,
      location: body.location,
      event_start: body.event_start,
      event_end: body.event_end,
      latitude: body.latitude,
      longitude: body.longitude,
      attendance_radius_meters: body.attendance_radius_meters,
    }

    // Validate date format if provided
    if (input.date) {
      const dateObj = new Date(input.date)
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        )
      }
    }

    // Validate event_start format if provided
    if (input.event_start) {
      const eventStartObj = new Date(input.event_start)
      if (isNaN(eventStartObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid event_start date format' },
          { status: 400 }
        )
      }
    }

    // Validate event_end format if provided
    if (input.event_end) {
      const eventEndObj = new Date(input.event_end)
      if (isNaN(eventEndObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid event_end date format' },
          { status: 400 }
        )
      }
    }

    // Validate new featured image if provided
    if (newFeaturedImage) {
      const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
      if (newFeaturedImage.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Featured image size ${(newFeaturedImage.size / 1024 / 1024).toFixed(2)}MB exceeds 20MB limit` },
          { status: 400 }
        )
      }
      if (!['image/jpeg', 'image/png'].includes(newFeaturedImage.type)) {
        return NextResponse.json(
          { error: 'Featured image must be JPEG or PNG' },
          { status: 400 }
        )
      }
    }

    // Update event
    const event = await EventService.updateEvent(user.id, id, input)

    if (!event) {
      return NextResponse.json(
        { error: 'Failed to update event. Check permissions or event existence.' },
        { status: 403 }
      )
    }

    // Handle featured image update
    if (removeFeaturedImage || newFeaturedImage) {
      // Get current event to access old featured image path
      const { data: currentEvent } = await supabase
        .from('events')
        .select('featured_image_storage_path, organization_id')
        .eq('id', id)
        .single()

      // Delete old featured image from storage if exists
      if (currentEvent?.featured_image_storage_path) {
        await supabase.storage
          .from('event-files')
          .remove([currentEvent.featured_image_storage_path])
      }

      if (removeFeaturedImage) {
        // Just remove the featured image
        await supabase
          .from('events')
          .update({
            featured_image_url: null,
            featured_image_storage_path: null,
          })
          .eq('id', id)
      } else if (newFeaturedImage && currentEvent) {
        // Upload new featured image
        const timestamp = Date.now()
        const sanitizedFileName = newFeaturedImage.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${currentEvent.organization_id}/${id}/featured/${timestamp}-${sanitizedFileName}`

        const { error: uploadError } = await supabase.storage
          .from('event-files')
          .upload(storagePath, newFeaturedImage, {
            contentType: newFeaturedImage.type,
            upsert: false,
          })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('event-files')
            .getPublicUrl(storagePath)

          await supabase
            .from('events')
            .update({
              featured_image_url: publicUrl,
              featured_image_storage_path: storagePath,
            })
            .eq('id', id)
        }
      }
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

// DELETE /api/event/[id] - Delete an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user profile exists
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { id } = await params

    const success = await EventService.deleteEvent(user.id, id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete event. Check permissions or event existence.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
