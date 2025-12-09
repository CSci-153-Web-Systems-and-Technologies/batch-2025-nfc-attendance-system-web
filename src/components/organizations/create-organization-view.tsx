'use client'

import { useState } from 'react'
import { Building2, ArrowLeft, AlertCircle, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface CreateOrganizationViewProps {
  userId: string
}

export function CreateOrganizationView({ userId }: CreateOrganizationViewProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tag: '',
  })
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Logo must be JPEG or PNG format')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(`Logo size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit`)
      return
    }

    setLogo(file)
    setError('')

    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setLogo(null)
    setLogoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Organization name is required')
      return
    }

    if (formData.tag.trim() && !/^[A-Z0-9]{2,10}$/.test(formData.tag.trim())) {
      setError('Tag must be 2-10 uppercase letters/numbers (e.g., FOC, CS101)')
      return
    }

    setIsSubmitting(true)

    try {
      let response

      if (logo) {
        // Use FormData for file upload
        const formDataPayload = new FormData()
        formDataPayload.append('data', JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          tag: formData.tag.trim() || null,
        }))
        formDataPayload.append('logo', logo)

        response = await fetch('/api/organization', {
          method: 'POST',
          body: formDataPayload,
        })
      } else {
        // Regular JSON request
        response = await fetch('/api/organization', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            tag: formData.tag.trim() || null,
          }),
        })
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create organization')
      }

      const data = await response.json()
      
      // Redirect to organizations page on success
      router.push('/organizations')
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the organization')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Create Organization</h1>
        </div>
        <p className="text-muted-foreground ml-15">
          Set up a new organization and invite members to join
        </p>
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
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-destructive">Error</h4>
                  <p className="text-sm text-destructive/90">{error}</p>
                </div>
              </div>
            )}

            {/* Organization Logo */}
            <div className="space-y-2">
              <Label>Organization Logo (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Recommended: Square image (1:1 ratio) • Max 5MB • JPG or PNG
              </p>
              {logoPreview ? (
                <div className="relative w-32 h-32">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-32 h-32 object-cover rounded-xl border border-input"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removeLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-input rounded-xl flex flex-col items-center justify-center hover:border-primary/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    id="logo"
                    accept="image/jpeg,image/png"
                    onChange={handleLogoChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="logo" className="cursor-pointer text-center p-2">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Upload logo</p>
                  </label>
                </div>
              )}
            </div>

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter organization name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                type="text"
                placeholder="e.g., FOC, CS, TECH"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value.toUpperCase() })}
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
                placeholder="Enter organization description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isSubmitting}
                rows={4}
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Provide a brief description of your organization's purpose
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-accent/50 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">What happens next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>You will be set as the organization owner</li>
                <li>You can invite members to join your organization</li>
                <li>You can create events and manage attendance</li>
                <li>You can assign roles to members (Admin, Attendance Taker, Member)</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
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
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
