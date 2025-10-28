// Organization types for the NFC Attendance System

export type OrganizationRole = 'Owner' | 'Admin' | 'Attendance Taker' | 'Member'

export interface Organization {
  id: string
  name: string
  description: string | null
  owner_user_id: string
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  joined_at: string
  updated_at: string
}

export interface OrganizationWithRole extends Organization {
  user_role: OrganizationRole
  member_count?: number
}

export interface OrganizationMemberWithUser extends OrganizationMember {
  user: {
    id: string
    name: string
    email: string
    user_type: string
  }
}

export interface CreateOrganizationInput {
  name: string
  description?: string
}

export interface UpdateOrganizationInput {
  name?: string
  description?: string
}

export interface AddMemberInput {
  user_id: string
  role: OrganizationRole
}

export interface UpdateMemberRoleInput {
  role: OrganizationRole
}

// Permission helpers
export const ROLE_PERMISSIONS = {
  Owner: {
    canManageOrganization: true,
    canDeleteOrganization: true,
    canManageMembers: true,
    canManageEvents: true,
    canTakeAttendance: true,
    canViewAttendance: true,
  },
  Admin: {
    canManageOrganization: true,
    canDeleteOrganization: false,
    canManageMembers: true,
    canManageEvents: true,
    canTakeAttendance: true,
    canViewAttendance: true,
  },
  'Attendance Taker': {
    canManageOrganization: false,
    canDeleteOrganization: false,
    canManageMembers: false,
    canManageEvents: false,
    canTakeAttendance: true,
    canViewAttendance: true,
  },
  Member: {
    canManageOrganization: false,
    canDeleteOrganization: false,
    canManageMembers: false,
    canManageEvents: false,
    canTakeAttendance: false,
    canViewAttendance: true,
  },
} as const

export function hasPermission(
  role: OrganizationRole,
  permission: keyof typeof ROLE_PERMISSIONS.Owner
): boolean {
  return ROLE_PERMISSIONS[role][permission]
}
