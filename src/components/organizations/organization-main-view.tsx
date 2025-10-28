'use client'

import { useState } from 'react'
import { OrganizationWithRole } from '@/types/organization'
import { OrganizationList } from './organization-list'
import { OrganizationEmptyState } from './organization-empty-state'
import { OrganizationContent } from './organization-content'

interface OrganizationMainViewProps {
  organizations: OrganizationWithRole[]
}

export function OrganizationMainView({ organizations }: OrganizationMainViewProps) {
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                My Organizations
              </h2>
              <button
                onClick={() => setShowList(!showList)}
                className="lg:hidden text-violet-600 text-sm font-medium"
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
