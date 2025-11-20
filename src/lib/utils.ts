import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Event status type
 */
export type EventStatus = 'ongoing' | 'upcoming' | 'past'

/**
 * Determines the current status of an event based on event_start, event_end, and date fields
 * Falls back to the date field for events without defined attendance windows
 * 
 * @param event - Event object with optional event_start, event_end, and date fields
 * @returns 'ongoing' if currently happening, 'upcoming' if in the future, 'past' if completed
 */
export function getEventStatus(event: {
  event_start?: string | null
  event_end?: string | null
  date: string
}): EventStatus {
  const now = new Date()

  // If event_start and event_end are defined, use them for precise status
  if (event.event_start && event.event_end) {
    const startTime = new Date(event.event_start)
    const endTime = new Date(event.event_end)

    if (now >= startTime && now <= endTime) {
      return 'ongoing'
    } else if (now < startTime) {
      return 'upcoming'
    } else {
      return 'past'
    }
  }

  // Fallback to date field for events without attendance window
  const eventDate = new Date(event.date)
  
  if (now > eventDate) {
    return 'past'
  }
  
  return 'upcoming'
}

/**
 * Formats a date string to a readable format
 * 
 * @param dateString - ISO 8601 date string
 * @returns Formatted date string
 */
export function formatEventDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formats a date string to a time string
 * 
 * @param dateString - ISO 8601 date string
 * @returns Formatted time string
 */
export function formatEventTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
