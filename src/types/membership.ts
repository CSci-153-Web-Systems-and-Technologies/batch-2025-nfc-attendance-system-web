// Membership types for the NFC Attendance System
// Memberships connect users to organizations with a specific role
// Each record acts as a "tag" (e.g., FOC:Admin, FOC:Member)

export type MembershipRole = 'Owner' | 'Admin' | 'Attendance Taker' | 'Member'

export interface Membership {
  id: string
  user_id: string
  organization_id: string
  role: MembershipRole
  joined_at: string
  updated_at: string
}

export interface MembershipWithOrganization extends Membership {
  organization: {
    id: string
    name: string
    description: string | null
    owner_user_id: string
  }
}

export interface MembershipWithUser extends Membership {
  user: {
    id: string
    name: string
    email: string
    user_type: string
    nfc_tag_id: string | null
  }
}

export interface MembershipWithDetails extends Membership {
  organization: {
    id: string
    name: string
    description: string | null
    owner_user_id: string
  }
  user: {
    id: string
    name: string
    email: string
    user_type: string
    nfc_tag_id: string | null
  }
}

export interface CreateMembershipInput {
  user_id: string
  organization_id: string
  role: MembershipRole
}

export interface UpdateMembershipInput {
  role?: MembershipRole
}

export interface MembershipFilters {
  user_id?: string
  organization_id?: string
  role?: MembershipRole
}

// Helper type for membership tags (e.g., "FOC:Admin")
export interface MembershipTag {
  organization_name: string
  role: MembershipRole
  tag: string // Format: "OrganizationName:Role"
}
