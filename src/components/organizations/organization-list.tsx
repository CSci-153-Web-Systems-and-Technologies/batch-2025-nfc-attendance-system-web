'use client'

import { Building2, Plus } from 'lucide-react'
import { OrganizationWithRole } from '@/types/organization'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface OrganizationListProps {
  organizations: OrganizationWithRole[]
  selectedOrg: OrganizationWithRole | null
  onSelectOrg: (org: OrganizationWithRole) => void
}

export function OrganizationList({
  organizations,
  selectedOrg,
  onSelectOrg,
}: OrganizationListProps) {
  const router = useRouter()

  const handleCreateOrg = () => {
    // Navigate to create organization page (to be implemented)
    router.push('/organizations/create')
  }

  return (
    <div className="space-y-2">
      {/* List of organizations */}
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => onSelectOrg(org)}
            className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 ${
              selectedOrg?.id === org.id
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-muted hover:bg-accent border-2 border-transparent'
            }`}
          >
            <div className="flex items-start gap-3">
              {org.logo_url ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={org.logo_url}
                    alt={`${org.name} logo`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedOrg?.id === org.id
                    ? 'bg-primary'
                    : 'bg-primary/20'
                }`}>
                  <Building2 className={`h-5 w-5 ${
                    selectedOrg?.id === org.id
                      ? 'text-primary-foreground'
                      : 'text-primary'
                  }`} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold text-sm truncate ${
                    selectedOrg?.id === org.id
                      ? 'text-primary'
                      : 'text-foreground'
                  }`}>
                    {org.name}
                  </h3>
                  {org.tag && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                      {org.tag}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Role: <span className="font-medium">{org.user_role}</span>
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-border my-4"></div>

      {/* Create Organization Button */}
      <Button
        onClick={handleCreateOrg}
        className="w-full bg-gradient-primary text-primary-foreground font-medium"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Organization
      </Button>
    </div>
  )
}
