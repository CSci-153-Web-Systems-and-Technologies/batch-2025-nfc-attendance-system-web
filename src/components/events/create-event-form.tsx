'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, MapPin, FileText, ArrowLeft, Loader2 } from 'lucide-react'

interface CreateEventFormProps {
  organizationId: string
  organizationName: string
}

export function CreateEventForm({ organizationId, organizationName }: CreateEventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    event_name: '',
    date: '',
    location: '',
    description: '',
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null) // Clear error on input change
  }

  const validateForm = (): string | null => {
    // Validate event name (3-200 characters)
    if (!formData.event_name.trim()) {
      return 'Event name is required'
    }
    if (formData.event_name.length < 3) {
      return 'Event name must be at least 3 characters long'
    }
    if (formData.event_name.length > 200) {
      return 'Event name must not exceed 200 characters'
    }

    // Validate date
    if (!formData.date) {
      return 'Event date and time is required'
    }
    const eventDate = new Date(formData.date)
    if (isNaN(eventDate.getTime())) {
      return 'Invalid date format'
    }

    // Validate location (max 500 characters)
    if (formData.location && formData.location.length > 500) {
      return 'Location must not exceed 500 characters'
    }

    // Validate description (max 2000 characters)
    if (formData.description && formData.description.length > 2000) {
      return 'Description must not exceed 2000 characters'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate form
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_name: formData.event_name,
          date: new Date(formData.date).toISOString(),
          organization_id: organizationId,
          location: formData.location || null,
          description: formData.description || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create event')
      }

      const data = await response.json()
      
      // Redirect to events list or event detail page
      router.push(`/organizations/${organizationId}/events`)
      router.refresh()
    } catch (err) {
      console.error('Error creating event:', err)
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/organizations/${organizationId}/events`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleCancel}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Create New Event</h1>
          <p className="text-sm text-gray-600">for {organizationName}</p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Event Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="event_name" className="text-sm font-medium text-gray-700">
                Event Name *
              </Label>
              <Input
                id="event_name"
                name="event_name"
                type="text"
                value={formData.event_name}
                onChange={handleInputChange}
                placeholder="e.g., Annual General Meeting"
                className="w-full"
                required
                minLength={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-500">
                {formData.event_name.length}/200 characters
              </p>
            </div>

            {/* Date and Time */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date and Time *
              </Label>
              <Input
                id="date"
                name="date"
                type="datetime-local"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full"
                required
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Main Conference Hall, Building A"
                className="w-full"
                maxLength={500}
              />
              <p className="text-xs text-gray-500">
                {formData.location.length}/500 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Provide more details about the event..."
                className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500">
                {formData.description.length}/2000 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-violet-600 hover:bg-violet-700 text-white px-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Event'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>

            {/* Required Field Note */}
            <p className="text-xs text-gray-500">
              * Required fields
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
