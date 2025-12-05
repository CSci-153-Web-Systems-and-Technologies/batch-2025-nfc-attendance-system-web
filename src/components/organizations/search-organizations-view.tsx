'use client'

import { useState, useEffect } from 'react'
import { Search, Building2, ArrowLeft, Users, Filter, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface SearchOrganizationsViewProps {
  userId: string
}

interface SearchFilters {
  sortField: 'name' | 'created_at' | 'member_count'
  sortOrder: 'asc' | 'desc'
  minMembers?: number
  maxMembers?: number
  excludeJoined: boolean
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next_page: boolean
  has_previous_page: boolean
}

export function SearchOrganizationsView({ userId }: SearchOrganizationsViewProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
    has_next_page: false,
    has_previous_page: false,
  })
  const [filters, setFilters] = useState<SearchFilters>({
    sortField: 'name',
    sortOrder: 'asc',
    excludeJoined: false,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [requestingJoin, setRequestingJoin] = useState<string | null>(null)
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set())

  // Auto-search when filters change (but not on initial mount)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (page: number = 1) => {
    setIsSearching(true)
    setHasSearched(true)
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sort: filters.sortField,
        order: filters.sortOrder,
        exclude_joined: filters.excludeJoined.toString(),
      })

      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim())
      }

      if (filters.minMembers !== undefined && filters.minMembers > 0) {
        params.set('min_members', filters.minMembers.toString())
      }

      if (filters.maxMembers !== undefined && filters.maxMembers > 0) {
        params.set('max_members', filters.maxMembers.toString())
      }

      const response = await fetch(`/api/organization/search?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to search organizations')
      }

      const data = await response.json()
      setSearchResults(data.results || [])
      setPagination(data.pagination || pagination)
      
      // Track pending requests from search results
      const pending = new Set<string>()
      data.results?.forEach((org: any) => {
        if (org.has_pending_request) {
          pending.add(org.id)
        }
      })
      setPendingRequests(pending)
    } catch (error) {
      console.error('Error searching organizations:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Re-search when filters change (after initial search)
  useEffect(() => {
    if (hasSearched) {
      handleSearch(1)
    }
  }, [filters])

  const handleRequestToJoin = async (organizationId: string) => {
    if (requestingJoin) return // Prevent multiple simultaneous requests

    setRequestingJoin(organizationId)
    
    try {
      const response = await fetch('/api/membership/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: organizationId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to request to join')
      }

      // Add to pending requests set
      setPendingRequests(prev => new Set(prev).add(organizationId))
      
      // Refresh search results to update the pending request status
      await handleSearch(pagination.page)
      
      // You could add a toast notification here
      alert('Join request sent successfully! Wait for admin approval.')
    } catch (error) {
      console.error('Error requesting to join:', error)
      alert(error instanceof Error ? error.message : 'Failed to send join request')
    } finally {
      setRequestingJoin(null)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.total_pages) return
    handleSearch(newPage)
  }

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Search className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Search Organizations</h1>
        </div>
        <p className="text-muted-foreground ml-15">
          Find and request to join organizations
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by organization name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
                className="w-full"
              />
            </div>
            <Button
              onClick={() => handleSearch(1)}
              disabled={isSearching}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-primary/30 text-primary hover:bg-accent"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortField}
                    onChange={(e) => handleFilterChange('sortField', e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="name">Name</option>
                    <option value="created_at">Date Created</option>
                    <option value="member_count">Member Count</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Order
                  </label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Min Members
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="No minimum"
                    value={filters.minMembers || ''}
                    onChange={(e) => handleFilterChange('minMembers', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Max Members
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="No maximum"
                    value={filters.maxMembers || ''}
                    onChange={(e) => handleFilterChange('maxMembers', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="excludeJoined"
                  checked={filters.excludeJoined}
                  onChange={(e) => handleFilterChange('excludeJoined', e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-ring border-input rounded"
                />
                <label htmlFor="excludeJoined" className="ml-2 text-sm text-foreground">
                  Exclude organizations I've already joined
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {isSearching ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground mt-4">Searching...</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Search Results ({pagination.total} total)
            </h2>
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.total_pages}
            </p>
          </div>

          {searchResults.map((org) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {org.logo_url ? (
                        <img 
                          src={org.logo_url} 
                          alt={`${org.name} logo`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-7 w-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground text-lg">
                          {org.name}
                        </h3>
                        {org.is_member && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                            Member
                          </span>
                        )}
                      </div>
                      {org.description && (
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                          {org.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span>{org.member_count || 0} members</span>
                        </div>
                        <span className="text-muted">•</span>
                        <span>Created {new Date(org.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-start pt-1">
                    {org.is_member ? (
                      <Button
                        onClick={() => router.push(`/organizations/${org.id}`)}
                        variant="outline"
                        className="border-primary/30 text-primary hover:bg-accent"
                      >
                        View
                      </Button>
                    ) : pendingRequests.has(org.id) || org.has_pending_request ? (
                      <Button
                        disabled
                        variant="outline"
                        className="border-secondary/50 text-secondary bg-secondary/10"
                      >
                        Request Pending
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleRequestToJoin(org.id)}
                        disabled={requestingJoin === org.id}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {requestingJoin === org.id ? 'Requesting...' : 'Request to Join'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.has_previous_page || isSearching}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1
                  } else if (pagination.page >= pagination.total_pages - 2) {
                    pageNum = pagination.total_pages - 4 + i
                  } else {
                    pageNum = pagination.page - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isSearching}
                      className={pagination.page === pageNum ? 'bg-primary hover:bg-primary/90' : ''}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.has_next_page || isSearching}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : hasSearched && !isSearching ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No results found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search query or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              Start searching for organizations
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Enter an organization name in the search bar above to find organizations you can join
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
