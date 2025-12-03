'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrganizationWithRole } from '@/types/organization'

interface EditOrganizationFormProps {
  organization: OrganizationWithRole
}

export function EditOrganizationForm({ organization }: EditOrganizationFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: organization.name,
    description: organization.description || '',
    tag: organization.tag || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Organization name is required'
    }

    if (formData.tag.trim() && !/^[A-Z0-9]{2,10}$/.test(formData.tag.trim())) {
      return 'Tag must be 2-10 uppercase letters/numbers (e.g., FOC, CS101)'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/organization/${organization.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          tag: formData.tag.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        
        // Handle specific error cases
        if (data.error?.includes('tag') && data.error?.includes('already')) {
          throw new Error('This tag is already in use by another organization. Please choose a different tag.')
        }
        
        throw new Error(data.error || 'Failed to update organization')
      }

      // Redirect back to settings page on success
      router.push(`/organizations/${organization.id}/settings`)
      router.refresh()
    } catch (err) {
      console.error('Error updating organization:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while updating the organization')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/organizations/${organization.id}/settings`)
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={handleCancel}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Settings
      </Button>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Organization</h1>
            <p className="text-muted-foreground">
              Update details for {organization.name}
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter organization name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Choose a clear and descriptive name for your organization
              </p>
            </div>

            {/* Organization Tag */}
            <div className="space-y-2">
              <Label htmlFor="tag">
                Organization Tag (Optional)
              </Label>
              <Input
                id="tag"
                name="tag"
                type="text"
                placeholder="e.g., FOC, CS, TECH"
                value={formData.tag}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, tag: e.target.value.toUpperCase() }))
                  setError(null)
                }}
                disabled={isSubmitting}
                className="w-full"
                maxLength={10}
              />
              <p className="text-sm text-muted-foreground">
                A short abbreviation (2-10 characters, uppercase letters/numbers) used to identify your organization
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <textarea
                id="description"
                name="description"
                placeholder="Enter organization description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={4}
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Provide a brief description of your organization&apos;s purpose
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>

            {/* Required Field Note */}
            <p className="text-xs text-muted-foreground">
              * Required fields
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
