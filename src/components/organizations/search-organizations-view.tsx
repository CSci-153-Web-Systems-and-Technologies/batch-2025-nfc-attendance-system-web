'use client'

import { useState } from 'react'
import { Search, Building2, ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface SearchOrganizationsViewProps {
  userId: string
}

export function SearchOrganizationsView({ userId }: SearchOrganizationsViewProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    
    // TODO: Implement actual search API call
    // For now, just simulate search
    setTimeout(() => {
      setSearchResults([])
      setIsSearching(false)
    }, 1000)
  }

  const handleRequestToJoin = async (organizationId: string) => {
    // TODO: Implement request to join functionality
    console.log('Request to join organization:', organizationId)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 hover:bg-violet-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Search className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Search Organizations</h1>
        </div>
        <p className="text-gray-600 ml-15">
          Find and request to join organizations
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by organization name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {isSearching ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-gray-600 mt-4">Searching...</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Search Results ({searchResults.length})
          </h2>
          {searchResults.map((org) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-200 to-purple-200 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 text-lg mb-1">
                        {org.name}
                      </h3>
                      {org.description && (
                        <p className="text-gray-600 text-sm mb-3">{org.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        <span>{org.member_count || 0} members</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRequestToJoin(org.id)}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    Request to Join
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchQuery && !isSearching ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">No results found</h3>
            <p className="text-gray-600 text-sm">
              Try searching with different keywords
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-violet-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Start searching for organizations
            </h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              Enter an organization name in the search bar above to find organizations you can join
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
