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

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editUserType, setEditUserType] = useState<UserType>('Student')
  const [editNfcTagId, setEditNfcTagId] = useState('')
  const [editQrCodeData, setEditQrCodeData] = useState('')

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
      <div className="flex items-center justify-center min-h-screen bg-violet-50/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-violet-50/30">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
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
      case 'Admin':
        return 'bg-purple-600'
      case 'Faculty':
        return 'bg-blue-600'
      case 'Student':
        return 'bg-emerald-600'
      default:
        return 'bg-gray-600'
    }
  }

  // Get organization role badge color
  const getRoleBadgeColor = (role: OrganizationRole) => {
    switch (role) {
      case 'Owner':
        return 'bg-violet-600'
      case 'Admin':
        return 'bg-blue-600'
      case 'Attendance Taker':
        return 'bg-cyan-600'
      case 'Member':
        return 'bg-gray-600'
      default:
        return 'bg-gray-600'
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
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{editError}</p>
              </div>
            )}

            {!isEditing ? (
              // View Mode
              <div className="space-y-6">
                {/* User Type Badge */}
                <div>
                  <Label className="text-gray-500 mb-2">User Type</Label>
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
                    <Label className="text-gray-500 mb-2">Organizations</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {memberships.map((membership, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${getRoleBadgeColor(
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
                  <Mail className="h-5 w-5 text-violet-600 mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-gray-500">Email Address</Label>
                    <p className="text-gray-900 mt-1">{user.email}</p>
                  </div>
                </div>

                {/* NFC Tag ID */}
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-violet-600 mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-gray-500">NFC Tag ID</Label>
                    <p className="text-gray-900 mt-1">
                      {user.nfc_tag_id || (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* QR Code Data */}
                <div className="flex items-start gap-3">
                  <QrCode className="h-5 w-5 text-violet-600 mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-gray-500">QR Code Data</Label>
                    <p className="text-gray-900 mt-1 break-all">
                      {user.qr_code_data || (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Account Created */}
                <div className="pt-4 border-t border-gray-100">
                  <Label className="text-gray-500">Member Since</Label>
                  <p className="text-gray-900 mt-1">
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
                    <option value="Admin">Admin</option>
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
      </div>
    </div>
  )
}
