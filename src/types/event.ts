// Event types for the NFC Attendance System

export interface Event {
  id: string
  event_name: string
  date: string
  organization_id: string
  description: string | null
  location: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface EventWithOrganization extends Event {
  organization: {
    id: string
    name: string
  }
}

export interface EventWithDetails extends Event {
  organization: {
    id: string
    name: string
  }
  created_by_user: {
    id: string
    name: string
    email: string
  }
  attendee_count?: number
}

export interface CreateEventInput {
  event_name: string
  date: string
  organization_id: string
  description?: string
  location?: string
}

export interface UpdateEventInput {
  event_name?: string
  date?: string
  description?: string
  location?: string
}

export interface EventFilters {
  organization_id?: string
  from_date?: string
  to_date?: string
  search?: string
}
