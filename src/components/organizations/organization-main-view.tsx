'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { OrganizationWithRole } from '@/types/organization'
import { OrganizationList } from './organization-list'
import { OrganizationEmptyState } from './organization-empty-state'
import { OrganizationContent } from './organization-content'
import { Button } from '@/components/ui/button'

interface OrganizationMainViewProps {
  organizations: OrganizationWithRole[]
}

export function OrganizationMainView({ organizations }: OrganizationMainViewProps) {
  const router = useRouter()
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithRole | null>(
    organizations.length > 0 ? organizations[0] : null
  )
  const [showList, setShowList] = useState(false)

  // If user has no organizations, show empty state
  if (organizations.length === 0) {
    return <OrganizationEmptyState />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Organization List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4 sticky top-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  My Organizations
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/organizations/search')}
                  className="h-8 w-8 text-violet-600 hover:bg-violet-100"
                  title="Search Organizations"
                  aria-label="Search organizations"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <button
                onClick={() => setShowList(!showList)}
                className="ml-auto lg:hidden text-violet-600 text-sm font-medium"
              >
                {showList ? 'Hide' : 'Show'}
              </button>
            </div>
            
            <div className={`${showList ? 'block' : 'hidden'} lg:block`}>
              <OrganizationList
                organizations={organizations}
                selectedOrg={selectedOrg}
                onSelectOrg={(org: OrganizationWithRole) => {
                  setSelectedOrg(org)
                  setShowList(false)
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedOrg && <OrganizationContent organization={selectedOrg} />}
        </div>
      </div>
    </div>
  )
}
