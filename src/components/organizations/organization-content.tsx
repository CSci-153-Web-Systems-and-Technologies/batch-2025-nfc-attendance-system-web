'use client'

import { OrganizationWithRole } from '@/types/organization'
import { Building2, Users, Calendar, Shield, UserPlus, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinRequestsCard } from './join-requests-card'
import { EventsPreviewCard } from './events-preview-card'
import { useRouter } from 'next/navigation'

interface OrganizationContentProps {
  organization: OrganizationWithRole
}

export function OrganizationContent({ organization }: OrganizationContentProps) {
  const router = useRouter()
  const isOwnerOrAdmin = organization.user_role === 'Owner' || organization.user_role === 'Admin'

  return (
    <div className="space-y-6">
      {/* Header Card - Simplified */}
      <Card className="bg-card shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {organization.name}
                </CardTitle>
                {organization.tag && (
                  <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-sm font-semibold rounded-full shrink-0">
                    {organization.tag}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">{organization.user_role}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        {organization.description && (
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">{organization.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Main Content Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions Card */}
        <Card className="bg-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => router.push(`/organizations/${organization.id}/members`)}
                className="p-3 sm:p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all duration-200 text-left"
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h4 className="font-medium text-foreground text-sm">Members</h4>
                    <p className="text-xs text-muted-foreground hidden sm:block">View all members</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => router.push(`/organizations/${organization.id}/events`)}
                className="p-3 sm:p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all duration-200 text-left"
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h4 className="font-medium text-foreground text-sm">Events</h4>
                    <p className="text-xs text-muted-foreground hidden sm:block">Manage events</p>
                  </div>
                </div>
              </button>

              {isOwnerOrAdmin && (
                <>
                  <button 
                    onClick={() => router.push(`/organizations/${organization.id}/requests`)}
                    className="p-3 sm:p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all duration-200 text-left"
                  >
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center shrink-0">
                        <UserPlus className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="text-center sm:text-left">
                        <h4 className="font-medium text-foreground text-sm">Requests</h4>
                        <p className="text-xs text-muted-foreground hidden sm:block">Join requests</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => router.push(`/organizations/${organization.id}/settings`)}
                    className="p-3 sm:p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all duration-200 text-left"
                  >
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center shrink-0">
                        <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-center sm:text-left">
                        <h4 className="font-medium text-foreground text-sm">Settings</h4>
                        <p className="text-xs text-muted-foreground hidden sm:block">Organization settings</p>
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Events Preview Card */}
        <EventsPreviewCard 
          organizationId={organization.id} 
          canManageEvents={isOwnerOrAdmin}
        />
      </div>

      {/* Join Requests Card - Only visible to Owners and Admins */}
      {isOwnerOrAdmin && (
        <JoinRequestsCard organizationId={organization.id} />
      )}
    </div>
  )
}
