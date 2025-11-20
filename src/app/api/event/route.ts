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
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit') as string)
      : undefined

    let events
    if (upcoming) {
      events = await EventService.getUpcomingEvents(userId, limit)
    } else if (past) {
      events = await EventService.getPastEvents(userId, limit)
    } else {
      events = await EventService.getUserEvents(userId, filters)
    }

    return NextResponse.json(events)
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

    const body = await request.json()
    const input: CreateEventInput = {
      event_name: body.event_name,
      date: body.date,
      organization_id: body.organization_id,
      description: body.description,
      location: body.location,
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

    const event = await EventService.createEvent(userId, input)

    if (!event) {
      return NextResponse.json(
        { error: 'Failed to create event. Check permissions.' },
        { status: 403 }
      )
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}
