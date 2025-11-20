'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Organization } from '@/types/organization'
import { MembershipRole } from '@/types/membership'
import { JoinRequestWithUser } from '@/types/join-request'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  UserPlus, 
  Search, 
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Loader2
} from 'lucide-react'

interface RequestsViewProps {
  organization: Organization
  initialRequests: JoinRequestWithUser[]
  currentUserRole: MembershipRole
}

export function RequestsView({ organization, initialRequests, currentUserRole }: RequestsViewProps) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Filter requests based on search and status
  const filteredRequests = requests.filter((request) => {
    const matchesSearch = 
      request.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  // Get request counts by status
  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  // Handle approve request
  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      const response = await fetch('/api/membership/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      })

      if (response.ok) {
        // Update local state
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'approved' as const, reviewed_at: new Date().toISOString() }
            : req
        ))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to approve request')
      }
    } catch (error) {
      console.error('Error approving request:', error)
      alert('An error occurred while approving the request')
    } finally {
      setProcessingId(null)
    }
  }

  // Handle reject request
  const handleReject = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      const response = await fetch('/api/membership/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      })

      if (response.ok) {
        // Update local state
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'rejected' as const, reviewed_at: new Date().toISOString() }
            : req
        ))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to reject request')
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('An error occurred while rejecting the request')
    } finally {
      setProcessingId(null)
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => router.push('/organizations')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Organizations
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <UserPlus className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Join Requests</h1>
        </div>
        <p className="text-muted-foreground">
          Managing join requests for <span className="font-semibold">{organization.name}</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card 
          className={`p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 ${
            selectedStatus === 'all' ? 'border-primary bg-primary/5' : 'border-transparent'
          }`}
          onClick={() => setSelectedStatus('all')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">All Requests</p>
              <p className="text-2xl font-bold text-foreground">{statusCounts.all}</p>
            </div>
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 ${
            selectedStatus === 'pending' ? 'border-secondary bg-secondary/10' : 'border-transparent'
          }`}
          onClick={() => setSelectedStatus('pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-secondary-foreground">{statusCounts.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-secondary-foreground" />
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 ${
            selectedStatus === 'approved' ? 'border-primary bg-primary/10' : 'border-transparent'
          }`}
          onClick={() => setSelectedStatus('approved')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-primary">{statusCounts.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 ${
            selectedStatus === 'rejected' ? 'border-destructive bg-destructive/10' : 'border-transparent'
          }`}
          onClick={() => setSelectedStatus('rejected')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-destructive">{statusCounts.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No requests found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedStatus !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'There are no join requests for this organization yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg shrink-0">
                    {request.user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Request Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">
                        {request.user.name}
                      </h3>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{request.user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span className="capitalize">{request.user.user_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Requested {new Date(request.requested_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {request.reviewed_at && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>
                            Reviewed {new Date(request.reviewed_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
                      size="sm"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </Button>
                    <Button 
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-2"
                      size="sm"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-8 text-center text-sm text-gray-600">
        Showing {filteredRequests.length} of {requests.length} requests
      </div>
    </div>
  )
}
