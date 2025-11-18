'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Building2, CreditCard, QrCode, Edit2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUserProfile } from '@/hooks/use-user-profile'
import type { UserType } from '@/types/user'
import type { OrganizationRole } from '@/types/organization'
import { TagDisplayCard } from '@/components/user/tag-display-card'
import { TagWriter } from '@/components/user/tag-writer'
import { TagGenerator } from '@/components/user/tag-generator'

interface UserMembership {
  role: OrganizationRole
  organization: {
    id: string
    name: string
    tag: string | null
  }
}

export function ProfilePage() {
  const router = useRouter()
  const { user, loading, error, refetch } = useUserProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  
  // Memberships state
  const [memberships, setMemberships] = useState<UserMembership[]>([])
  const [membershipsLoading, setMembershipsLoading] = useState(true)

  // Tag state
  const [currentTagId, setCurrentTagId] = useState<string | null>(null)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editUserType, setEditUserType] = useState<UserType>('Student')
  const [editNfcTagId, setEditNfcTagId] = useState('')
  const [editQrCodeData, setEditQrCodeData] = useState('')

  // Initialize tag state from user data
  useEffect(() => {
    if (user) {
      setCurrentTagId(user.tag_id || null)
    }
  }, [user])

  // Handle tag generation callback
  const handleTagGenerated = (newTagId: string) => {
    setCurrentTagId(newTagId)
    // Refetch user to update the profile
    refetch()
  }

  // Fetch user memberships
  useEffect(() => {
    const fetchMemberships = async () => {
      if (!user) return
      
      try {
        const response = await fetch('/api/user/memberships')
        if (response.ok) {
          const data = await response.json()
          setMemberships(data.memberships || [])
        }
      } catch (error) {
        console.error('Error fetching memberships:', error)
      } finally {
        setMembershipsLoading(false)
      }
    }

    fetchMemberships()
  }, [user])

  const handleEditClick = () => {
    if (user) {
      setEditName(user.name)
      setEditUserType(user.user_type)
      setEditNfcTagId(user.nfc_tag_id || '')
      setEditQrCodeData(user.qr_code_data || '')
      setIsEditing(true)
      setEditError(null)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditError(null)
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setEditError(null)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim(),
          user_type: editUserType,
          nfc_tag_id: editNfcTagId.trim() || null,
          qr_code_data: editQrCodeData.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Refresh user data
      await refetch()
      setIsEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground mb-4">
              {error || 'Failed to load profile. Please complete your profile first.'}
            </p>
            <Button onClick={() => router.push('/complete-profile')} className="w-full">
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get user type badge color
  const getUserTypeBadgeColor = (type: UserType) => {
    switch (type) {
      case 'Faculty':
        return 'bg-accent'
      case 'Student':
        return 'bg-primary'
      default:
        return 'bg-muted'
    }
  }

  // Get organization role badge color
  const getRoleBadgeColor = (role: OrganizationRole) => {
    switch (role) {
      case 'Owner':
        return 'bg-primary'
      case 'Admin':
        return 'bg-accent'
      case 'Attendance Taker':
        return 'bg-secondary'
      case 'Member':
        return 'bg-muted'
      default:
        return 'bg-muted'
    }
  }

  // Format membership tag display
  const formatMembershipTag = (membership: UserMembership) => {
    const orgDisplay = membership.organization.tag || membership.organization.name
    
    // If role is Member, show only organization name/tag
    if (membership.role === 'Member') {
      return orgDisplay
    }
    
    // Otherwise, show "ORG: ROLE"
    return `${orgDisplay}: ${membership.role}`
  }

  return (
    <div className="min-h-screen bg-violet-50/30 py-8 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <User className="h-8 w-8 md:h-10 md:w-10 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl">{user.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                </div>
              </div>
              
              {/* Edit/Cancel Button */}
              {!isEditing ? (
                <Button
                  onClick={handleEditClick}
                  variant="outline"
                  className="gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </Button>
              ) : (
                <Button
                  onClick={handleCancelEdit}
                  variant="ghost"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {editError && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{editError}</p>
              </div>
            )}

            {!isEditing ? (
              // View Mode
              <div className="space-y-6">
                {/* User Type Badge */}
                <div>
                  <Label className="text-muted-foreground mb-2">User Type</Label>
                  <div className="flex gap-2 mt-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${getUserTypeBadgeColor(
                        user.user_type
                      )}`}
                    >
                      {user.user_type}
                    </span>
                  </div>
                </div>

                {/* Organization Memberships */}
                {!membershipsLoading && memberships.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2">Organizations</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {memberships.map((membership, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-primary-foreground ${getRoleBadgeColor(
                            membership.role
                          )}`}
                        >
                          {formatMembershipTag(membership)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-muted-foreground">Email Address</Label>
                    <p className="text-foreground mt-1">{user.email}</p>
                  </div>
                </div>

                {/* NFC Tag ID */}
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-muted-foreground">NFC Tag ID</Label>
                    <p className="text-foreground mt-1">
                      {user.nfc_tag_id || (
                        <span className="text-muted-foreground italic">Not set</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* QR Code Data */}
                <div className="flex items-start gap-3">
                  <QrCode className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-muted-foreground">QR Code Data</Label>
                    <p className="text-foreground mt-1 break-all">
                      {user.qr_code_data || (
                        <span className="text-muted-foreground italic">Not set</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Account Created */}
                <div className="pt-4 border-t border-border">
                  <Label className="text-muted-foreground">Member Since</Label>
                  <p className="text-foreground mt-1">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isSaving}
                    className="mt-2"
                  />
                </div>

                {/* User Type */}
                <div>
                  <Label htmlFor="edit-user-type">User Type</Label>
                  <select
                    id="edit-user-type"
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm mt-2"
                    value={editUserType}
                    onChange={(e) => setEditUserType(e.target.value as UserType)}
                    disabled={isSaving}
                  >
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                  </select>
                </div>

                {/* NFC Tag ID */}
                <div>
                  <Label htmlFor="edit-nfc">NFC Tag ID</Label>
                  <Input
                    id="edit-nfc"
                    type="text"
                    value={editNfcTagId}
                    onChange={(e) => setEditNfcTagId(e.target.value)}
                    disabled={isSaving}
                    placeholder="Enter NFC tag ID"
                    className="mt-2"
                  />
                </div>

                {/* QR Code Data */}
                <div>
                  <Label htmlFor="edit-qr">QR Code Data</Label>
                  <Input
                    id="edit-qr"
                    type="text"
                    value={editQrCodeData}
                    onChange={(e) => setEditQrCodeData(e.target.value)}
                    disabled={isSaving}
                    placeholder="Enter QR code data"
                    className="mt-2"
                  />
                </div>

                {/* Save Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tag Management Section */}
        <div className="mt-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            Attendance Tag Management
          </h2>
          <p className="text-gray-600 mb-6">
            Manage your NFC and QR code tags for attendance tracking
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Tag Display & Writer Column */}
            <div className="space-y-6">
              <TagDisplayCard
                tagId={currentTagId}
                userName={user.name}
              />
              
              <TagWriter
                tagId={currentTagId}
                userName={user.name}
              />
            </div>

            {/* Tag Generator Column */}
            <div>
              <TagGenerator
                currentTagId={currentTagId}
                onTagGenerated={handleTagGenerated}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
