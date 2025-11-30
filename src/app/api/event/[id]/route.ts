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
    const body = await request.json()

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

    const event = await EventService.updateEvent(user.id, id, input)

    if (!event) {
      return NextResponse.json(
        { error: 'Failed to update event. Check permissions or event existence.' },
        { status: 403 }
      )
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
