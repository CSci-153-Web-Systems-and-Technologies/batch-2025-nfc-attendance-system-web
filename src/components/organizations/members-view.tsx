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
  ArrowLeft,
  ClipboardCheck
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
    'Attendance Taker': initialMembers.filter(m => m.role === 'Attendance Taker').length,
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
        return <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      case 'Admin':
        return <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      case 'Attendance Taker':
        return <ClipboardCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
      case 'Member':
        return <User className="w-4 h-4 text-muted-foreground" />
    }
  }

  // Get role color
  const getRoleColor = (role: MembershipRole) => {
    switch (role) {
      case 'Owner':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      case 'Admin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      case 'Attendance Taker':
        return 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
      case 'Member':
        return 'bg-muted text-foreground border-border'
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
          'Attendance Taker': newMembers.filter(m => m.role === 'Attendance Taker').length,
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
          <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          <h1 className="text-3xl font-bold text-foreground">Members</h1>
        </div>
        <p className="text-muted-foreground">
          Managing members for <span className="font-semibold">{organization.name}</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <Card className="p-3 md:p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800" onClick={() => setSelectedRole('All')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total</p>
              <p className="text-xl md:text-2xl font-bold text-foreground">{roleCount.All}</p>
            </div>
            <Users className="w-6 h-6 md:w-8 md:h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </Card>

        <Card className="p-3 md:p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-amber-200 dark:hover:border-amber-800" onClick={() => setSelectedRole('All')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Managers</p>
              <p className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400">{roleCount.Owner + roleCount.Admin}</p>
            </div>
            <div className="flex -space-x-1">
              <Crown className="w-5 h-5 md:w-6 md:h-6 text-amber-600 dark:text-amber-400" />
              <Shield className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-teal-200 dark:hover:border-teal-800" onClick={() => setSelectedRole('Attendance Taker')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground"><span className="hidden sm:inline">Attendance </span>Takers</p>
              <p className="text-xl md:text-2xl font-bold text-teal-600 dark:text-teal-400">{roleCount['Attendance Taker']}</p>
            </div>
            <ClipboardCheck className="w-6 h-6 md:w-8 md:h-8 text-teal-600 dark:text-teal-400" />
          </div>
        </Card>

        <Card className="p-3 md:p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-border" onClick={() => setSelectedRole('Member')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Members</p>
              <p className="text-xl md:text-2xl font-bold text-muted-foreground">{roleCount.Member}</p>
            </div>
            <User className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1.5 md:gap-2 flex-wrap">
            {(['All', 'Owner', 'Admin', 'Attendance Taker', 'Member'] as const).map((role) => (
              <Button
                key={role}
                variant={selectedRole === role ? 'default' : 'outline'}
                onClick={() => setSelectedRole(role)}
                size="sm"
                className="text-xs md:text-sm px-2 md:px-3"
              >
                {role === 'Attendance Taker' ? <><span className="sm:hidden">Taker</span><span className="hidden sm:inline">Att. Taker</span></> : role}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Members List */}
      {isRefreshing ? (
        <Card className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading members...</p>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No members found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedRole !== 'All'
              ? 'Try adjusting your search or filter criteria.'
              : 'This organization has no members yet.'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Debug: Total={total}, Members={members.length}, InitialMembers={initialMembers.length}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="p-4 md:p-6 hover:shadow-md transition-shadow">
              {/* Mobile Layout: Stacked */}
              <div className="flex flex-col gap-3">
                {/* Header: Avatar + Name + Role Badge */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-base md:text-lg shrink-0">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base md:text-lg font-semibold text-foreground truncate">
                        {member.user.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getRoleColor(member.role)}`}>
                        {getRoleIcon(member.role)}
                        <span className="hidden xs:inline">{member.role === 'Attendance Taker' ? 'Taker' : member.role}</span>
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.user.email}</p>
                  </div>
                </div>

                {/* Details: Joined date + NFC (collapsible on mobile) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground pl-0 md:pl-14">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Joined {new Date(member.joined_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  {member.user.nfc_tag_id && (
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {member.user.nfc_tag_id}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions: Full width row on mobile */}
                {canManageTarget(member) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    {/* Member can be promoted to Attendance Taker */}
                    {member.role === 'Member' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1.5 text-xs h-8"
                        disabled={actionLoadingId === member.id}
                        onClick={() => updateRole(member.id, 'Attendance Taker')}
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Make Taker</span>
                      </Button>
                    )}
                    {/* Attendance Taker can be promoted to Admin or demoted to Member */}
                    {member.role === 'Attendance Taker' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 gap-1.5 text-xs h-8"
                          disabled={actionLoadingId === member.id}
                          onClick={() => updateRole(member.id, 'Admin')}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>To Admin</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 gap-1.5 text-xs h-8"
                          disabled={actionLoadingId === member.id}
                          onClick={() => updateRole(member.id, 'Member')}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>To Member</span>
                        </Button>
                      </>
                    )}
                    {/* Admin can be demoted to Attendance Taker */}
                    {member.role === 'Admin' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1.5 text-xs h-8"
                        disabled={actionLoadingId === member.id}
                        onClick={() => updateRole(member.id, 'Attendance Taker')}
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>To Taker</span>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 h-8 w-8 p-0 shrink-0"
                      disabled={actionLoadingId === member.id}
                      onClick={() => removeMember(member.id)}
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
          {/* Sentinel for infinite scroll */}
          <div ref={loadMoreRef} />
          {isLoadingMore && (
            <Card className="p-4 text-center text-sm text-muted-foreground">Loading more...</Card>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        Showing {filteredMembers.length} of {total} members
      </div>
    </div>
  )
}
