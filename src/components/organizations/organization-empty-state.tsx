'use client'

import { Search, Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function OrganizationEmptyState() {
  const router = useRouter()

  const handleSearchOrganizations = () => {
    // Navigate to search organizations page (to be implemented)
    router.push('/organizations/search')
  }

  const handleCreateOrganization = () => {
    // Navigate to create organization page (to be implemented)
    router.push('/organizations/create')
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
            <Building2 className="h-10 w-10 text-violet-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            No Organizations Yet
          </h1>

          {/* Description */}
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            You haven't joined any organizations yet. Search for organizations to
            request to join, or create your own organization to get started.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleSearchOrganizations}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-medium px-8 py-6 text-base"
            >
              <Search className="h-5 w-5 mr-2" />
              Search Organizations
            </Button>

            <Button
              onClick={handleCreateOrganization}
              variant="outline"
              className="border-2 border-violet-500 text-violet-600 hover:bg-violet-50 font-medium px-8 py-6 text-base"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Organization
            </Button>
          </div>

          {/* Info Section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              What can you do with organizations?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-800 text-sm mb-1">
                  Join Organizations
                </h4>
                <p className="text-xs text-gray-600">
                  Connect with existing organizations and become a member
                </p>
              </div>
              <div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <Plus className="h-5 w-5 text-green-600" />
                </div>
                <h4 className="font-medium text-gray-800 text-sm mb-1">
                  Create Your Own
                </h4>
                <p className="text-xs text-gray-600">
                  Start a new organization and invite members to join
                </p>
              </div>
              <div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <Search className="h-5 w-5 text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-800 text-sm mb-1">
                  Manage Events
                </h4>
                <p className="text-xs text-gray-600">
                  Organize events and track attendance with NFC
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
