'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrganizationWithRole, hasPermission } from '@/types/organization'
import { MembershipWithUser } from '@/types/membership'
import { 
  Building2, 
  Calendar, 
  Users, 
  Shield, 
  AlertTriangle, 
  Trash2, 
  UserCog,
  ArrowLeft,
  CalendarSync,
  Pencil
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OrganizationSettingsProps {
  organization: OrganizationWithRole
  members: MembershipWithUser[]
  ownerName: string
}

export function OrganizationSettings({ 
  organization, 
  members,
  ownerName 
}: OrganizationSettingsProps) {
  const router = useRouter()
  const isOwner = organization.user_role === 'Owner'
  const canEdit = hasPermission(organization.user_role, 'canManageOrganization')
  
  // Delete organization state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Transfer ownership state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('')
  const [transferConfirmation, setTransferConfirmation] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Get members who can become owners (everyone except current owner)
  const transferableMembers = members.filter(m => m.user_id !== organization.owner_user_id)

  const handleDeleteOrganization = async () => {
    if (deleteConfirmation !== organization.name) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/organization/${organization.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/organizations')
        router.refresh()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete organization')
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
      alert('An error occurred while deleting the organization')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner || transferConfirmation !== organization.name) return
    
    setIsTransferring(true)
    try {
      const response = await fetch(`/api/organization/${organization.id}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_owner_id: selectedNewOwner }),
      })

      if (response.ok) {
        setTransferDialogOpen(false)
        router.refresh()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to transfer ownership')
      }
    } catch (error) {
      console.error('Error transferring ownership:', error)
      alert('An error occurred while transferring ownership')
    } finally {
      setIsTransferring(false)
    }
  }

  const selectedMember = transferableMembers.find(m => m.user_id === selectedNewOwner)

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/organizations')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Organizations
      </Button>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Organization Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage settings and preferences for {organization.name}
        </p>
      </div>

      <div className="space-y-6">
        {/* Organization Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Organization Information</CardTitle>
                  <CardDescription>Basic details about your organization</CardDescription>
                </div>
              </div>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/organizations/${organization.id}/edit`)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">Name</Label>
                <p className="font-medium text-foreground">{organization.name}</p>
              </div>

              {/* Tag */}
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">Tag</Label>
                <p className="font-medium text-foreground">
                  {organization.tag ? (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-sm rounded">
                      {organization.tag}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">No tag set</span>
                  )}
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1 md:col-span-2">
                <Label className="text-muted-foreground text-sm">Description</Label>
                <p className="font-medium text-foreground">
                  {organization.description || (
                    <span className="text-muted-foreground italic">No description</span>
                  )}
                </p>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Created Date */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">{formatDate(organization.created_at)}</p>
                  </div>
                </div>

                {/* Member Count */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="text-sm font-medium">{organization.member_count || 0} members</p>
                  </div>
                </div>

                {/* Owner */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Owner</p>
                    <p className="text-sm font-medium">{ownerName}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Previews Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <CalendarSync className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Feature Previews</CardTitle>
                <CardDescription>Upcoming features and integrations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center border">
                    <CalendarSync className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">Google Calendar Sync</h4>
                      <Badge variant="info">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatically sync your organization&apos;s events with Google Calendar. 
                      Members will be able to see events in their personal calendars.
                    </p>
                  </div>
                </div>
                <Button variant="outline" disabled className="shrink-0">
                  Enable
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone - Owner Only */}
        {isOwner && (
          <Card className="border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions that require careful consideration
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Transfer Ownership */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <UserCog className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground">Transfer Ownership</h4>
                    <p className="text-sm text-muted-foreground">
                      Transfer this organization to another member. You will become an Admin.
                    </p>
                  </div>
                </div>
                <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Transfer</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Transfer Ownership</DialogTitle>
                      <DialogDescription>
                        Select a member to become the new owner of this organization. 
                        This action cannot be undone. You will be demoted to Admin.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Select New Owner</Label>
                        <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a member..." />
                          </SelectTrigger>
                          <SelectContent>
                            {transferableMembers.map((member) => (
                              <SelectItem key={member.user_id} value={member.user_id}>
                                {member.user.name} ({member.user.email}) - {member.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedMember && (
                          <p className="text-sm text-muted-foreground">
                            <strong>{selectedMember.user.name}</strong> will become the new owner.
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>
                          Type <strong className="text-foreground">{organization.name}</strong> to confirm
                        </Label>
                        <Input
                          value={transferConfirmation}
                          onChange={(e) => setTransferConfirmation(e.target.value)}
                          placeholder="Enter organization name"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTransferDialogOpen(false)
                          setSelectedNewOwner('')
                          setTransferConfirmation('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleTransferOwnership}
                        disabled={
                          !selectedNewOwner || 
                          transferConfirmation !== organization.name || 
                          isTransferring
                        }
                      >
                        {isTransferring ? 'Transferring...' : 'Transfer Ownership'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Delete Organization */}
              <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive">Delete Organization</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this organization and all its data including events, 
                      attendance records, and member associations.
                    </p>
                  </div>
                </div>
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Delete</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-destructive">Delete Organization</DialogTitle>
                      <DialogDescription>
                        This action <strong>cannot be undone</strong>. This will permanently delete 
                        the <strong>{organization.name}</strong> organization and remove all 
                        associated data including:
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>All events and their attendance records</li>
                        <li>All member associations and roles</li>
                        <li>All pending join requests</li>
                        <li>All uploaded files and attachments</li>
                      </ul>
                      <div className="mt-4 space-y-2">
                        <Label>
                          Type <strong className="text-foreground">{organization.name}</strong> to confirm
                        </Label>
                        <Input
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder="Enter organization name"
                          className="border-destructive/50 focus-visible:ring-destructive/50"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDeleteDialogOpen(false)
                          setDeleteConfirmation('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteOrganization}
                        disabled={deleteConfirmation !== organization.name || isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete Organization'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
