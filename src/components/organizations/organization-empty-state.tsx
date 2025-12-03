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
        <div className="bg-card rounded-xl shadow-lg p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto bg-gradient-muted rounded-full flex items-center justify-center mb-6">
            <Building2 className="h-10 w-10 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-4">
            No Organizations Yet
          </h1>

          {/* Description */}
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            You haven't joined any organizations yet. Search for organizations to
            request to join, or create your own organization to get started.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleSearchOrganizations}
              className="bg-gradient-primary text-primary-foreground font-medium px-8 py-6 text-base"
            >
              <Search className="h-5 w-5 mr-2" />
              Search Organizations
            </Button>

            <Button
              onClick={handleCreateOrganization}
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-accent font-medium px-8 py-6 text-base"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Organization
            </Button>
          </div>

          {/* Info Section */}
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              What can you do with organizations?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">
                  Join Organizations
                </h4>
                <p className="text-xs text-muted-foreground">
                  Connect with existing organizations and become a member
                </p>
              </div>
              <div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-3">
                  <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">
                  Create Your Own
                </h4>
                <p className="text-xs text-muted-foreground">
                  Start a new organization and invite members to join
                </p>
              </div>
              <div>
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-3">
                  <Search className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">
                  Manage Events
                </h4>
                <p className="text-xs text-muted-foreground">
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
