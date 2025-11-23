import { createClient } from '@/lib/server'
import type {
  Event,
  EventWithOrganization,
  EventWithDetails,
  CreateEventInput,
  UpdateEventInput,
  EventFilters,
} from '@/types/event'

export class EventService {
  /**
   * Validate event input against database constraints
   * Returns error message if validation fails, null if valid
   */
  static validateEventInput(input: CreateEventInput | UpdateEventInput): string | null {
    // Validate event_name length (3-200 characters)
    if ('event_name' in input && input.event_name) {
      if (input.event_name.length < 3) {
        return 'Event name must be at least 3 characters long'
      }
      if (input.event_name.length > 200) {
        return 'Event name must not exceed 200 characters'
      }
    }

    // Validate location length (max 500 characters)
    if ('location' in input && input.location) {
      if (input.location.length > 500) {
        return 'Location must not exceed 500 characters'
      }
    }

    // Validate description length (max 2000 characters)
    if ('description' in input && input.description) {
      if (input.description.length > 2000) {
        return 'Description must not exceed 2000 characters'
      }
    }

    // Validate event_start and event_end relationship
    if ('event_start' in input && 'event_end' in input) {
      const eventStart = input.event_start
      const eventEnd = input.event_end

      // If both are provided, validate that start < end
      if (eventStart && eventEnd) {
        const startDate = new Date(eventStart)
        const endDate = new Date(eventEnd)

        if (startDate >= endDate) {
          return 'Event Start must be before Event End'
        }
      }

      // If one is provided but not the other, return error
      if ((eventStart && !eventEnd) || (!eventStart && eventEnd)) {
        return 'Both Event Start and Event End must be set together, or leave both empty'
      }
    }

    return null
  }
  /**
   * Create a new event
   * Only authorized members (Owner, Admin, Attendance Taker) can create events
   * Uses can_create_event_in_org() database function for permission check
   */
  static async createEvent(
    userId: string,
    input: CreateEventInput
  ): Promise<Event | null> {
    // Validate input against database constraints
    const validationError = this.validateEventInput(input)
    if (validationError) {
      console.error('Validation error:', validationError)
      return null
    }

    const supabase = await createClient()

    // Use database function to check permission
    const { data: hasPermission, error: permError } = await supabase.rpc(
      'can_create_event_in_org',
      {
        p_organization_id: input.organization_id,
        p_user_id: userId,
      }
    )

    if (permError || !hasPermission) {
      console.error('User does not have permission to create events:', permError)
      return null
    }

    const { data, error } = await supabase
      .from('events')
      .insert({
        event_name: input.event_name,
        date: input.date,
        organization_id: input.organization_id,
        description: input.description || null,
        location: input.location || null,
        event_start: input.event_start || null,
        event_end: input.event_end || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return null
    }

    return data
  }

  /**
   * Get an event by ID
   */
  static async getEventById(
    userId: string,
    eventId: string
  ): Promise<Event | null> {
    const supabase = await createClient()

    // First verify user has access to this event (through organization membership)
    const { data, error } = await supabase
      .from('events')
      .select(
        `
        *,
        organizations!inner(id)
      `
      )
      .eq('id', eventId)
      .single()

    if (error || !data) {
      console.error('Error fetching event:', error)
      return null
    }

    // Verify user is a member of the organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', data.organization_id)
      .eq('user_id', userId)
      .single()

    if (!member) {
      console.error('User does not have access to this event')
      return null
    }

    return data
  }

  /**
   * Get event with full details including organization and creator info
   * Uses events_with_details view for optimized query
   */
  static async getEventWithDetails(
    userId: string,
    eventId: string
  ): Promise<EventWithDetails | null> {
    const supabase = await createClient()

    // Query the events_with_details view
    const { data, error } = await supabase
      .from('events_with_details')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error || !data) {
      console.error('Error fetching event details:', error)
      return null
    }

    // Verify user is a member of the organization (RLS will also enforce this)
    const { data: member } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', data.organization_id)
      .eq('user_id', userId)
      .single()

    if (!member) {
      console.error('User does not have access to this event')
      return null
    }

    // Transform view data to match EventWithDetails type
    return {
      id: data.id,
      event_name: data.event_name,
      date: data.date,
      organization_id: data.organization_id,
      description: data.description,
      location: data.location,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      event_start: data.event_start,
      event_end: data.event_end,
      organization: {
        id: data.organization_id,
        name: data.organization_name,
      },
      created_by_user: {
        id: data.created_by,
        name: data.creator_name,
        email: data.creator_email,
      },
    }
  }

  /**
   * Get all events for a user (across all their organizations)
   */
  static async getUserEvents(
    userId: string,
    filters?: EventFilters
  ): Promise<EventWithOrganization[]> {
    const supabase = await createClient()

    // First get user's organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)

    if (!memberships || memberships.length === 0) {
      return []
    }

    const organizationIds = memberships.map((m) => m.organization_id)

    let query = supabase
      .from('events')
      .select(
        `
        *,
        organizations!inner(id, name)
      `
      )
      .in('organization_id', organizationIds)

    // Apply filters
    if (filters?.organization_id) {
      query = query.eq('organization_id', filters.organization_id)
    }

    if (filters?.from_date) {
      query = query.gte('date', filters.from_date)
    }

    if (filters?.to_date) {
      query = query.lte('date', filters.to_date)
    }

    if (filters?.search) {
      query = query.or(
        `event_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query.order('date', { ascending: false })

    if (error) {
      console.error('Error fetching user events:', error)
      return []
    }

    // Transform the data to match our type
    return data.map((event) => {
      const organization = Array.isArray(event.organizations)
        ? event.organizations[0]
        : event.organizations

      return {
        ...event,
        organization: {
          id: organization.id,
          name: organization.name,
        },
      }
    })
  }

  /**
   * Get all events for a specific organization
   */
  static async getOrganizationEvents(
    userId: string,
    organizationId: string,
    filters?: Omit<EventFilters, 'organization_id'>
  ): Promise<Event[]> {
    const supabase = await createClient()

    // Verify user is a member of the organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single()

    if (!member) {
      console.error('User is not a member of this organization')
      return []
    }

    let query = supabase
      .from('events')
      .select('*')
      .eq('organization_id', organizationId)

    // Apply filters
    if (filters?.from_date) {
      query = query.gte('date', filters.from_date)
    }

    if (filters?.to_date) {
      query = query.lte('date', filters.to_date)
    }

    if (filters?.search) {
      query = query.or(
        `event_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query.order('date', { ascending: false })

    if (error) {
      console.error('Error fetching organization events:', error)
      return []
    }

    return data
  }

  /**
   * Update an event
   * Only event creator OR organization Owner/Admin can update events
   * Uses can_manage_event() database function for permission check
   */
  static async updateEvent(
    userId: string,
    eventId: string,
    input: UpdateEventInput
  ): Promise<Event | null> {
    // Validate input against database constraints
    const validationError = this.validateEventInput(input)
    if (validationError) {
      console.error('Validation error:', validationError)
      return null
    }

    const supabase = await createClient()

    // Use database function to check permission
    const { data: canManage, error: permError } = await supabase.rpc(
      'can_manage_event',
      {
        p_event_id: eventId,
        p_user_id: userId,
      }
    )

    if (permError || !canManage) {
      console.error('User does not have permission to update this event:', permError)
      return null
    }

    const updateData: Record<string, any> = {}
    if (input.event_name !== undefined) updateData.event_name = input.event_name
    if (input.date !== undefined) updateData.date = input.date
    if (input.description !== undefined)
      updateData.description = input.description
    if (input.location !== undefined) updateData.location = input.location
    if (input.event_start !== undefined) updateData.event_start = input.event_start
    if (input.event_end !== undefined) updateData.event_end = input.event_end

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      console.error('Error updating event:', error)
      return null
    }

    return data
  }

  /**
   * Delete an event
   * Only event creator OR organization Owner/Admin can delete events
   * Uses can_manage_event() database function for permission check
   */
  static async deleteEvent(
    userId: string,
    eventId: string
  ): Promise<boolean> {
    const supabase = await createClient()

    // Use database function to check permission
    const { data: canManage, error: permError } = await supabase.rpc(
      'can_manage_event',
      {
        p_event_id: eventId,
        p_user_id: userId,
      }
    )

    if (permError || !canManage) {
      console.error('User does not have permission to delete this event:', permError)
      return false
    }

    const { error } = await supabase.from('events').delete().eq('id', eventId)

    if (error) {
      console.error('Error deleting event:', error)
      return false
    }

    return true
  }

  /**
   * Get upcoming events for a user (events in the future)
   * Uses upcoming_events view for optimized query
   */
  static async getUpcomingEvents(
    userId: string,
    limit: number = 10
  ): Promise<EventWithOrganization[]> {
    const supabase = await createClient()

    // First get user's organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)

    if (!memberships || memberships.length === 0) {
      return []
    }

    const organizationIds = memberships.map((m) => m.organization_id)

    // Query the upcoming_events view
    const { data, error } = await supabase
      .from('upcoming_events')
      .select('*')
      .in('organization_id', organizationIds)
      .limit(limit)

    if (error) {
      console.error('Error fetching upcoming events:', error)
      return []
    }

    // Transform view data to match EventWithOrganization type
    return data.map((event) => ({
      id: event.id,
      event_name: event.event_name,
      date: event.date,
      organization_id: event.organization_id,
      description: event.description,
      location: event.location,
      created_by: event.created_by,
      created_at: event.created_at,
      updated_at: event.updated_at,
      event_start: event.event_start,
      event_end: event.event_end,
      organization: {
        id: event.organization_id,
        name: event.organization_name,
      },
    }))
  }

  /**
   * Get past events for a user
   * Uses past_events view for optimized query
   */
  static async getPastEvents(
    userId: string,
    limit: number = 10
  ): Promise<EventWithOrganization[]> {
    const supabase = await createClient()

    // First get user's organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)

    if (!memberships || memberships.length === 0) {
      return []
    }

    const organizationIds = memberships.map((m) => m.organization_id)

    // Query the past_events view
    const { data, error } = await supabase
      .from('past_events')
      .select('*')
      .in('organization_id', organizationIds)
      .limit(limit)

    if (error) {
      console.error('Error fetching past events:', error)
      return []
    }

    // Transform view data to match EventWithOrganization type
    return data.map((event) => ({
      id: event.id,
      event_name: event.event_name,
      date: event.date,
      organization_id: event.organization_id,
      description: event.description,
      location: event.location,
      created_by: event.created_by,
      created_at: event.created_at,
      updated_at: event.updated_at,
      event_start: event.event_start,
      event_end: event.event_end,
      organization: {
        id: event.organization_id,
        name: event.organization_name,
      },
    }))
  }

  /**
   * Get currently ongoing events for a user
   * Events where now >= event_start AND now <= event_end
   * Falls back to same-day events if event_start/event_end are null
   */
  static async getOngoingEvents(
    userId: string,
    limit: number = 10
  ): Promise<EventWithOrganization[]> {
    const supabase = await createClient()

    // First get user's organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)

    if (!memberships || memberships.length === 0) {
      return []
    }

    const organizationIds = memberships.map((m) => m.organization_id)
    const now = new Date().toISOString()

    // Query events with attendance windows that are currently active
    // OR events on today's date without defined windows
    const { data, error } = await supabase
      .from('events')
      .select(
        `
        *,
        organizations!inner(id, name)
      `
      )
      .in('organization_id', organizationIds)
      .or(`and(event_start.lte.${now},event_end.gte.${now}),and(event_start.is.null,event_end.is.null,date.gte.${new Date().toISOString().split('T')[0]},date.lt.${new Date(Date.now() + 86400000).toISOString().split('T')[0]})`)
      .order('date', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching ongoing events:', error)
      return []
    }

    // Transform the data to match EventWithOrganization type
    return data.map((event) => {
      const organization = Array.isArray(event.organizations)
        ? event.organizations[0]
        : event.organizations

      return {
        id: event.id,
        event_name: event.event_name,
        date: event.date,
        organization_id: event.organization_id,
        description: event.description,
        location: event.location,
        created_by: event.created_by,
        created_at: event.created_at,
        updated_at: event.updated_at,
        event_start: event.event_start,
        event_end: event.event_end,
        organization: {
          id: organization.id,
          name: organization.name,
        },
      }
    })
  }

  /**
   * Get event count for an organization
   * Uses get_organization_event_count() database function
   */
  static async getOrganizationEventCount(
    organizationId: string
  ): Promise<number> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_organization_event_count', {
      p_organization_id: organizationId,
    })

    if (error) {
      console.error('Error getting organization event count:', error)
      return 0
    }

    return data || 0
  }

  /**
   * Get upcoming event count for an organization
   * Uses get_upcoming_events_count() database function
   */
  static async getUpcomingEventsCount(
    organizationId: string
  ): Promise<number> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_upcoming_events_count', {
      p_organization_id: organizationId,
    })

    if (error) {
      console.error('Error getting upcoming events count:', error)
      return 0
    }

    return data || 0
  }

  /**
   * Get event count for a user (events they created)
   * Uses get_user_events_count() database function
   */
  static async getUserEventsCount(userId: string): Promise<number> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_user_events_count', {
      p_user_id: userId,
    })

    if (error) {
      console.error('Error getting user events count:', error)
      return 0
    }

    return data || 0
  }
}
