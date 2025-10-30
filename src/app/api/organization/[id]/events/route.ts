import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { EventService } from '@/lib/services/event.service'
import { UserService } from '@/lib/services/user.service'
import type { EventFilters } from '@/types/event'

// GET /api/organization/[id]/events - Get all events for a specific organization
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

    const { id: organizationId } = await params

    const { searchParams } = new URL(request.url)
    const filters: Omit<EventFilters, 'organization_id'> = {}

    // Parse query parameters
    if (searchParams.get('from_date')) {
      filters.from_date = searchParams.get('from_date') as string
    }
    if (searchParams.get('to_date')) {
      filters.to_date = searchParams.get('to_date') as string
    }
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search') as string
    }

    const events = await EventService.getOrganizationEvents(
      user.id,
      organizationId,
      filters
    )

    return NextResponse.json({
      events,
      count: events.length,
      organization_id: organizationId,
    })
  } catch (error) {
    console.error('Error fetching organization events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization events' },
      { status: 500 }
    )
  }
}
