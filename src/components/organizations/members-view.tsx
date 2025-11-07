'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MembershipWithUser, MembershipRole } from '@/types/membership'
import { Organization } from '@/types/organization'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Search, 
  Crown, 
  Shield, 
  UserCheck, 
  User,
  Mail,
  Calendar,
  MoreVertical,
  Trash2,
  UserCog,
  ArrowLeft
} from 'lucide-react'

interface MembersViewProps {
  organization: Organization
  initialMembers: MembershipWithUser[]
  total: number
  pageSize: number
  organizationId: string
  currentUserRole: MembershipRole
  currentUserId: string
}

export function MembersView({ 
  organization, 
  initialMembers, 
  total: initialTotal,
  pageSize,
  organizationId,
  currentUserRole,
  currentUserId,
}: MembersViewProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<MembershipRole | 'All'>('All')
  const [members, setMembers] = useState<MembershipWithUser[]>(initialMembers)
  const [total, setTotal] = useState<number>(initialTotal)
  const [offset, setOffset] = useState<number>(initialMembers.length)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const isInitialMount = useRef(true)
  const [totalRoleCount, setTotalRoleCount] = useState(() => ({
    All: initialTotal,
    Owner: initialMembers.filter(m => m.role === 'Owner').length,
    Admin: initialMembers.filter(m => m.role === 'Admin').length,
    Member: initialMembers.filter(m => m.role === 'Member').length,
  }))

  // Debug logging
  useEffect(() => {
    console.log('MembersView - initialMembers:', initialMembers)
    console.log('MembersView - total:', initialTotal)
    console.log('MembersView - members state:', members)
  }, [])

  // Filter members based on search and role (search is client-side for now)
  const filteredMembers = members.filter((member) => {
    const matchesSearch = 
      member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = selectedRole === 'All' || member.role === selectedRole
    
    return matchesSearch && matchesRole
  })

  // Get role icon
  const getRoleIcon = (role: MembershipRole) => {
    switch (role) {
      case 'Owner':
        return <Crown className="w-4 h-4 text-amber-600" />
      case 'Admin':
        return <Shield className="w-4 h-4 text-purple-600" />
      case 'Member':
        return <User className="w-4 h-4 text-gray-600" />
    }
  }

  // Get role color
  const getRoleColor = (role: MembershipRole) => {
    switch (role) {
      case 'Owner':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Member':
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Check if current user can manage members
  const canManageMembers = currentUserRole === 'Owner' || currentUserRole === 'Admin'

  const canManageTarget = (m: MembershipWithUser) => {
    // Cannot manage owners, and cannot manage own membership
    if (m.role === 'Owner') return false
    if (m.user.id === currentUserId) return false
    return canManageMembers
  }

  // Get member count by role
  const roleCount = totalRoleCount

  // Fetch helpers
  const fetchMembers = async (opts: { reset?: boolean } = {}) => {
    const effectiveOffset = opts.reset ? 0 : offset
    const roleParam = selectedRole !== 'All' ? `&role=${encodeURIComponent(selectedRole)}` : ''
    const res = await fetch(`/api/membership/organization/${organizationId}?limit=${pageSize}&offset=${effectiveOffset}${roleParam}`)
    if (!res.ok) return
    const json = await res.json()
    const newMembers: MembershipWithUser[] = json.members || []
    const newTotal: number | undefined = json.total

    if (opts.reset) {
      setMembers(newMembers)
      setOffset(newMembers.length)
    } else {
      setMembers((prev) => [...prev, ...newMembers])
      setOffset((prev) => prev + newMembers.length)
    }
    if (typeof newTotal === 'number') {
      setTotal(newTotal)
      // Update total role counts only when fetching all members
      if (selectedRole === 'All') {
        setTotalRoleCount({
          All: newTotal,
          Owner: newMembers.filter(m => m.role === 'Owner').length,
          Admin: newMembers.filter(m => m.role === 'Admin').length,
          Member: newMembers.filter(m => m.role === 'Member').length,
        })
      }
    }
  }

  // Reset and refetch when role filter changes
  useEffect(() => {
    // Skip on initial mount - use server-side data
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    // For server-side role filter; search stays client-side
    setIsRefreshing(true)
    fetchMembers({ reset: true }).finally(() => setIsRefreshing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, organizationId])

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return
    const el = loadMoreRef.current
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0]
      if (first.isIntersecting && !isLoadingMore && members.length < total) {
        setIsLoadingMore(true)
        fetchMembers().finally(() => setIsLoadingMore(false))
      }
    }, { rootMargin: '200px' })

    observer.observe(el)
    return () => observer.unobserve(el)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length, total, isLoadingMore, selectedRole, organizationId])

  // Actions
  const updateRole = async (membershipId: string, role: MembershipRole) => {
    try {
      setActionLoadingId(membershipId)
      const res = await fetch(`/api/membership/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update role')
      }
      const { membership } = await res.json()
      setMembers((prev) => prev.map((m) => (m.id === membership.id ? { ...m, role: membership.role } : m)))
      
      // Update total role counts
      setTotalRoleCount((prev) => {
        const oldMember = members.find(m => m.id === membershipId)
        if (!oldMember) return prev
        
        const newCounts = { ...prev }
        const oldRole = oldMember.role as keyof typeof prev
        const newRole = role as keyof typeof prev
        newCounts[oldRole] = Math.max(newCounts[oldRole] - 1, 0)
        newCounts[newRole] = newCounts[newRole] + 1
        return newCounts
      })
    } catch (e) {
      console.error(e)
      alert((e as Error).message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const removeMember = async (membershipId: string) => {
    try {
      if (!confirm('Remove this member from the organization?')) return
      setActionLoadingId(membershipId)
      const res = await fetch(`/api/membership/${membershipId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to remove member')
      }
      const memberToRemove = members.find(m => m.id === membershipId)
      setMembers((prev) => prev.filter((m) => m.id !== membershipId))
      setTotal((prev) => Math.max(prev - 1, 0))
      
      // Update total role counts
      if (memberToRemove) {
        setTotalRoleCount((prev) => {
          const newCounts = { ...prev }
          const role = memberToRemove.role as keyof typeof prev
          newCounts[role] = Math.max(newCounts[role] - 1, 0)
          newCounts.All = Math.max(newCounts.All - 1, 0)
          return newCounts
        })
      }
    } catch (e) {
      console.error(e)
      alert((e as Error).message)
    } finally {
      setActionLoadingId(null)
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
          <Users className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        </div>
        <p className="text-gray-600">
          Managing members for <span className="font-semibold">{organization.name}</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-200" onClick={() => setSelectedRole('All')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">All Members</p>
              <p className="text-2xl font-bold text-gray-900">{roleCount.All}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-amber-200" onClick={() => setSelectedRole('Owner')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Owners</p>
              <p className="text-2xl font-bold text-amber-600">{roleCount.Owner}</p>
            </div>
            <Crown className="w-8 h-8 text-amber-600" />
          </div>
        </Card>

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-200" onClick={() => setSelectedRole('Admin')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-purple-600">{roleCount.Admin}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-gray-200" onClick={() => setSelectedRole('Member')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Members</p>
              <p className="text-2xl font-bold text-gray-600">{roleCount.Member}</p>
            </div>
            <User className="w-8 h-8 text-gray-600" />
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['All', 'Owner', 'Admin', 'Member'] as const).map((role) => (
              <Button
                key={role}
                variant={selectedRole === role ? 'default' : 'outline'}
                onClick={() => setSelectedRole(role)}
                size="sm"
              >
                {role}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Members List */}
      {isRefreshing ? (
        <Card className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading members...</p>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-600">
            {searchQuery || selectedRole !== 'All'
              ? 'Try adjusting your search or filter criteria.'
              : 'This organization has no members yet.'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Debug: Total={total}, Members={members.length}, InitialMembers={initialMembers.length}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-lg">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Member Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {member.user.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}>
                        {getRoleIcon(member.role)}
                        {member.role}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{member.user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Joined {new Date(member.joined_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      {member.user.nfc_tag_id && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <UserCheck className="w-4 h-4" />
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            NFC: {member.user.nfc_tag_id}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {canManageTarget(member) && (
                  <div className="flex items-center gap-2">
                    {member.role !== 'Admin' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        disabled={actionLoadingId === member.id}
                        onClick={() => updateRole(member.id, 'Admin')}
                      >
                        <UserCog className="w-4 h-4" />
                        Promote to Admin
                      </Button>
                    )}
                    {member.role === 'Admin' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        disabled={actionLoadingId === member.id}
                        onClick={() => updateRole(member.id, 'Member')}
                      >
                        <UserCog className="w-4 h-4" />
                        Demote to Member
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={actionLoadingId === member.id}
                      onClick={() => removeMember(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
          {/* Sentinel for infinite scroll */}
          <div ref={loadMoreRef} />
          {isLoadingMore && (
            <Card className="p-4 text-center text-sm text-gray-600">Loading more...</Card>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-8 text-center text-sm text-gray-600">
        Showing {filteredMembers.length} of {total} members
      </div>
    </div>
  )
}
