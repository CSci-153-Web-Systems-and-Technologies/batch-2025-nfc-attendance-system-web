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
   * Create a new event
   * Only authorized members (Owner, Admin, Attendance Taker) can create events
   */
  static async createEvent(
    userId: string,
    input: CreateEventInput
  ): Promise<Event | null> {
    const supabase = await createClient()

    // Verify user has permission to create events in this organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', input.organization_id)
      .eq('user_id', userId)
      .single()

    if (
      !member ||
      !['Owner', 'Admin', 'Attendance Taker'].includes(member.role)
    ) {
      console.error('User does not have permission to create events')
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
   */
  static async getEventWithDetails(
    userId: string,
    eventId: string
  ): Promise<EventWithDetails | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('events')
      .select(
        `
        *,
        organizations!inner(id, name),
        users!events_created_by_fkey(id, name, email)
      `
      )
      .eq('id', eventId)
      .single()

    if (error || !data) {
      console.error('Error fetching event details:', error)
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

    // Transform the data to match our type
    const organization = Array.isArray(data.organizations)
      ? data.organizations[0]
      : data.organizations
    const creator = Array.isArray(data.users) ? data.users[0] : data.users

    return {
      ...data,
      organization: {
        id: organization.id,
        name: organization.name,
      },
      created_by_user: {
        id: creator.id,
        name: creator.name,
        email: creator.email,
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
   * Only authorized members (Owner, Admin, Attendance Taker) can update events
   */
  static async updateEvent(
    userId: string,
    eventId: string,
    input: UpdateEventInput
  ): Promise<Event | null> {
    const supabase = await createClient()

    // First get the event to check organization
    const event = await this.getEventById(userId, eventId)
    if (!event) {
      return null
    }

    // Verify user has permission to update events in this organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', event.organization_id)
      .eq('user_id', userId)
      .single()

    if (
      !member ||
      !['Owner', 'Admin', 'Attendance Taker'].includes(member.role)
    ) {
      console.error('User does not have permission to update events')
      return null
    }

    const updateData: Record<string, any> = {}
    if (input.event_name !== undefined) updateData.event_name = input.event_name
    if (input.date !== undefined) updateData.date = input.date
    if (input.description !== undefined)
      updateData.description = input.description
    if (input.location !== undefined) updateData.location = input.location

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
   * Only Owners and Admins can delete events
   */
  static async deleteEvent(
    userId: string,
    eventId: string
  ): Promise<boolean> {
    const supabase = await createClient()

    // First get the event to check organization
    const event = await this.getEventById(userId, eventId)
    if (!event) {
      return false
    }

    // Verify user has permission to delete events (Owner or Admin only)
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', event.organization_id)
      .eq('user_id', userId)
      .single()

    if (!member || !['Owner', 'Admin'].includes(member.role)) {
      console.error('User does not have permission to delete events')
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
   */
  static async getUpcomingEvents(
    userId: string,
    limit: number = 10
  ): Promise<EventWithOrganization[]> {
    const now = new Date().toISOString()
    const events = await this.getUserEvents(userId, { from_date: now })
    return events.slice(0, limit)
  }

  /**
   * Get past events for a user
   */
  static async getPastEvents(
    userId: string,
    limit: number = 10
  ): Promise<EventWithOrganization[]> {
    const now = new Date().toISOString()
    const events = await this.getUserEvents(userId, { to_date: now })
    return events.slice(0, limit)
  }
}
