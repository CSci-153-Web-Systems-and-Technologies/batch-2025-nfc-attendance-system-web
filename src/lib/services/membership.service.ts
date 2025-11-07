import { createClient } from '@/lib/server'
import type {
  Membership,
  MembershipWithOrganization,
  MembershipWithUser,
  MembershipWithDetails,
  CreateMembershipInput,
  UpdateMembershipInput,
  MembershipFilters,
  MembershipTag,
  MembershipRole,
} from '@/types/membership'

export class MembershipService {
  /**
   * Create a new membership (add user to organization)
   * Only Owners and Admins can add members
   */
  static async createMembership(
    input: CreateMembershipInput
  ): Promise<Membership | null> {
    const supabase = await createClient()

    // Check if membership already exists
    const { data: existing } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', input.user_id)
      .eq('organization_id', input.organization_id)
      .single()

    if (existing) {
      console.error('Membership already exists')
      return null
    }

    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        user_id: input.user_id,
        organization_id: input.organization_id,
        role: input.role,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating membership:', error)
      return null
    }

    return data
  }

  /**
   * Get membership by ID
   */
  static async getMembershipById(
    membershipId: string
  ): Promise<Membership | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('id', membershipId)
      .single()

    if (error) {
      console.error('Error fetching membership:', error)
      return null
    }

    return data
  }

  /**
   * Get membership with organization details
   */
  static async getMembershipWithOrganization(
    membershipId: string
  ): Promise<MembershipWithOrganization | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        *,
        organization:organizations (
          id,
          name,
          description,
          owner_user_id
        )
      `
      )
      .eq('id', membershipId)
      .single()

    if (error) {
      console.error('Error fetching membership with organization:', error)
      return null
    }

    return data as MembershipWithOrganization
  }

  /**
   * Get membership with user details
   */
  static async getMembershipWithUser(
    membershipId: string
  ): Promise<MembershipWithUser | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        *,
        user:users (
          id,
          name,
          email,
          user_type,
          nfc_tag_id
        )
      `
      )
      .eq('id', membershipId)
      .single()

    if (error) {
      console.error('Error fetching membership with user:', error)
      return null
    }

    return data as MembershipWithUser
  }

  /**
   * Get membership with full details (organization and user)
   */
  static async getMembershipWithDetails(
    membershipId: string
  ): Promise<MembershipWithDetails | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        *,
        organization:organizations (
          id,
          name,
          description,
          owner_user_id
        ),
        user:users (
          id,
          name,
          email,
          user_type,
          nfc_tag_id
        )
      `
      )
      .eq('id', membershipId)
      .single()

    if (error) {
      console.error('Error fetching membership with details:', error)
      return null
    }

    return data as MembershipWithDetails
  }

  /**
   * Get all memberships with optional filters
   */
  static async getMemberships(
    filters?: MembershipFilters
  ): Promise<Membership[]> {
    const supabase = await createClient()

    let query = supabase.from('organization_members').select('*')

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters?.organization_id) {
      query = query.eq('organization_id', filters.organization_id)
    }

    if (filters?.role) {
      query = query.eq('role', filters.role)
    }

    const { data, error } = await query.order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching memberships:', error)
      return []
    }

    return data || []
  }

  /**
   * Get user's memberships with organization details
   */
  static async getUserMemberships(
    userId: string
  ): Promise<MembershipWithOrganization[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        *,
        organization:organizations (
          id,
          name,
          description,
          owner_user_id
        )
      `
      )
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching user memberships:', error)
      return []
    }

    return (data || []) as MembershipWithOrganization[]
  }

  /**
   * Get organization's members with user details
   */
  static async getOrganizationMembers(
    organizationId: string
  ): Promise<MembershipWithUser[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        *,
        user:users (
          id,
          name,
          email,
          user_type,
          nfc_tag_id
        )
      `
      )
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching organization members:', error)
      return []
    }

    return (data || []) as MembershipWithUser[]
  }

  /**
   * Get organization's members with pagination and optional role filter
   */
  static async getOrganizationMembersPaged(
    organizationId: string,
    options?: { limit?: number; offset?: number; role?: MembershipRole }
  ): Promise<MembershipWithUser[]> {
    const supabase = await createClient()

    const limit = options?.limit ?? 20
    const offset = options?.offset ?? 0

    let query = supabase
      .from('organization_members')
      .select(
        `
        *,
        user:users (
          id,
          name,
          email,
          user_type,
          nfc_tag_id
        )
      `
      )
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (options?.role) {
      query = query.eq('role', options.role)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching paged organization members:', error)
      return []
    }

    return (data || []) as MembershipWithUser[]
  }

  /**
   * Get user's membership in a specific organization
   */
  static async getUserMembershipInOrganization(
    userId: string,
    organizationId: string
  ): Promise<Membership | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      console.error('Error fetching user membership in organization:', error)
      return null
    }

    return data
  }

  /**
   * Update membership role
   * Only Owners and Admins can update roles
   */
  static async updateMembership(
    membershipId: string,
    input: UpdateMembershipInput
  ): Promise<Membership | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .update({
        role: input.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId)
      .select()
      .single()

    if (error) {
      console.error('Error updating membership:', error)
      return null
    }

    return data
  }

  /**
   * Delete membership (remove user from organization)
   * Only Owners and Admins can remove members
   * Owners cannot be removed (must transfer ownership first)
   */
  static async deleteMembership(membershipId: string): Promise<boolean> {
    const supabase = await createClient()

    // First check if this is an Owner membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('id', membershipId)
      .single()

    if (membership?.role === 'Owner') {
      console.error('Cannot remove Owner. Transfer ownership first.')
      return false
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', membershipId)

    if (error) {
      console.error('Error deleting membership:', error)
      return false
    }

    return true
  }

  /**
   * Check if user has a specific role in an organization
   */
  static async userHasRole(
    userId: string,
    organizationId: string,
    role: MembershipRole
  ): Promise<boolean> {
    const membership = await this.getUserMembershipInOrganization(
      userId,
      organizationId
    )

    return membership?.role === role
  }

  /**
   * Check if user has at least a specific permission level
   * Permission hierarchy: Owner > Admin > Attendance Taker > Member
   */
  static async userHasPermission(
    userId: string,
    organizationId: string,
    requiredRole: MembershipRole
  ): Promise<boolean> {
    const membership = await this.getUserMembershipInOrganization(
      userId,
      organizationId
    )

    if (!membership) return false

    const roleHierarchy: Record<MembershipRole, number> = {
      Owner: 4,
      Admin: 3,
      'Attendance Taker': 2,
      Member: 1,
    }

    return roleHierarchy[membership.role] >= roleHierarchy[requiredRole]
  }

  /**
   * Get user's membership tags (OrganizationName:Role format)
   */
  static async getUserMembershipTags(userId: string): Promise<MembershipTag[]> {
    const memberships = await this.getUserMemberships(userId)

    return memberships.map((membership) => ({
      organization_name: membership.organization.name,
      role: membership.role,
      tag: `${membership.organization.name}:${membership.role}`,
    }))
  }

  /**
   * Count memberships by filters
   */
  static async countMemberships(filters?: MembershipFilters): Promise<number> {
    const supabase = await createClient()

    let query = supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters?.organization_id) {
      query = query.eq('organization_id', filters.organization_id)
    }

    if (filters?.role) {
      query = query.eq('role', filters.role)
    }

    const { count, error } = await query

    if (error) {
      console.error('Error counting memberships:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Bulk create memberships
   */
  static async bulkCreateMemberships(
    inputs: CreateMembershipInput[]
  ): Promise<Membership[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .insert(inputs)
      .select()

    if (error) {
      console.error('Error bulk creating memberships:', error)
      return []
    }

    return data || []
  }

  /**
   * Transfer organization ownership
   * Updates the old owner to Admin and new member to Owner
   */
  static async transferOwnership(
    organizationId: string,
    currentOwnerId: string,
    newOwnerId: string
  ): Promise<boolean> {
    const supabase = await createClient()

    // Update current owner to Admin
    const { error: oldOwnerError } = await supabase
      .from('organization_members')
      .update({ role: 'Admin', updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('user_id', currentOwnerId)

    if (oldOwnerError) {
      console.error('Error updating old owner:', oldOwnerError)
      return false
    }

    // Update new owner
    const { error: newOwnerError } = await supabase
      .from('organization_members')
      .update({ role: 'Owner', updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('user_id', newOwnerId)

    if (newOwnerError) {
      console.error('Error updating new owner:', newOwnerError)
      return false
    }

    // Update organization owner_user_id
    const { error: orgError } = await supabase
      .from('organizations')
      .update({ owner_user_id: newOwnerId, updated_at: new Date().toISOString() })
      .eq('id', organizationId)

    if (orgError) {
      console.error('Error updating organization owner:', orgError)
      return false
    }

    return true
  }
}
