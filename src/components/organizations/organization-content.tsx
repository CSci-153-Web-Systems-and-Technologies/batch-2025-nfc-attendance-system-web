'use client'

import { OrganizationWithRole } from '@/types/organization'
import { Building2, Users, Calendar, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinRequestsCard } from './join-requests-card'

interface OrganizationContentProps {
  organization: OrganizationWithRole
}

export function OrganizationContent({ organization }: OrganizationContentProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-white shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl font-bold text-gray-800">
                  {organization.name}
                </CardTitle>
                {organization.tag && (
                  <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-semibold rounded-full">
                    {organization.tag}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4 text-violet-600" />
                <span className="font-medium">{organization.user_role}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Description */}
            {organization.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Description
                </h3>
                <p className="text-gray-600">{organization.description}</p>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Users className="h-4 w-4" />
                  <span>Members</span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  {organization.member_count || 0} members
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created</span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  {formatDate(organization.created_at)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-violet-500 hover:bg-violet-50 transition-all duration-200 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 text-sm">View Members</h4>
                  <p className="text-xs text-gray-500">See all organization members</p>
                </div>
              </div>
            </button>

            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-violet-500 hover:bg-violet-50 transition-all duration-200 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 text-sm">View Events</h4>
                  <p className="text-xs text-gray-500">Manage organization events</p>
                </div>
              </div>
            </button>

            {(organization.user_role === 'Owner' || organization.user_role === 'Admin') && (
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-violet-500 hover:bg-violet-50 transition-all duration-200 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 text-sm">Settings</h4>
                    <p className="text-xs text-gray-500">Manage organization settings</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Join Requests Card - Only visible to Owners and Admins */}
      {(organization.user_role === 'Owner' || organization.user_role === 'Admin') && (
        <JoinRequestsCard organizationId={organization.id} />
      )}

      {/* Recent Activity Card - Placeholder */}
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
