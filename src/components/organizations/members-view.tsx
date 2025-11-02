'use client'

import { useState } from 'react'
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
  members: MembershipWithUser[]
  currentUserRole: MembershipRole
}

export function MembersView({ organization, members, currentUserRole }: MembersViewProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<MembershipRole | 'All'>('All')

  // Filter members based on search and role
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
      case 'Attendance Taker':
        return <UserCheck className="w-4 h-4 text-blue-600" />
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
      case 'Attendance Taker':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Member':
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Check if current user can manage members
  const canManageMembers = currentUserRole === 'Owner' || currentUserRole === 'Admin'

  // Get member count by role
  const roleCount = {
    All: members.length,
    Owner: members.filter(m => m.role === 'Owner').length,
    Admin: members.filter(m => m.role === 'Admin').length,
    'Attendance Taker': members.filter(m => m.role === 'Attendance Taker').length,
    Member: members.filter(m => m.role === 'Member').length,
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200" onClick={() => setSelectedRole('Attendance Taker')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Takers</p>
              <p className="text-2xl font-bold text-blue-600">{roleCount['Attendance Taker']}</p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-600" />
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
            {(['All', 'Owner', 'Admin', 'Attendance Taker', 'Member'] as const).map((role) => (
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
      {filteredMembers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-600">
            {searchQuery || selectedRole !== 'All'
              ? 'Try adjusting your search or filter criteria.'
              : 'This organization has no members yet.'}
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
                {canManageMembers && member.role !== 'Owner' && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <UserCog className="w-4 h-4" />
                      Manage
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
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
        Showing {filteredMembers.length} of {members.length} members
      </div>
    </div>
  )
}
