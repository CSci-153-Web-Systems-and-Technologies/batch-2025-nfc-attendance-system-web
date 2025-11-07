'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserCheck, UserX, Clock, User } from 'lucide-react'
import { JoinRequestWithUser } from '@/types/join-request'

interface JoinRequestsCardProps {
  organizationId: string
}

export function JoinRequestsCard({ organizationId }: JoinRequestsCardProps) {
  const [requests, setRequests] = useState<JoinRequestWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Fetch pending join requests
  useEffect(() => {
    fetchRequests()
  }, [organizationId])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/organization/${organizationId}/join-requests`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch join requests')
      }

      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Error fetching join requests:', error)
      alert('Failed to load join requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      const response = await fetch('/api/membership/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          organization_id: organizationId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve request')
      }

      alert('User has been added to the organization')

      // Refresh the list
      fetchRequests()
    } catch (error) {
      console.error('Error approving request:', error)
      alert(error instanceof Error ? error.message : 'Failed to approve request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      const response = await fetch('/api/membership/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          organization_id: organizationId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject request')
      }

      alert('Join request has been declined')

      // Refresh the list
      fetchRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert(error instanceof Error ? error.message : 'Failed to reject request')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Join Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Loading requests...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Join Requests
          </CardTitle>
          {requests.length > 0 && (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full">
              {requests.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No pending join requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 text-sm">
                        {request.user?.name || 'Unknown User'}
                      </h4>
                      <p className="text-xs text-gray-500 mb-1">
                        {request.user?.email}
                      </p>
                      <p className="text-xs text-gray-400">
                        Requested {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      {processingId === request.id ? 'Approving...' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      {processingId === request.id ? 'Rejecting...' : 'Reject'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
