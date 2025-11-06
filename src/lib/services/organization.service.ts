import { createClient } from '@/lib/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Organization,
  OrganizationMember,
  OrganizationWithRole,
  OrganizationMemberWithUser,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  AddMemberInput,
  UpdateMemberRoleInput,
  OrganizationRole,
} from '@/types/organization'

export class OrganizationService {
  /**
   * Create a new organization
   * Automatically adds the creator as Owner
   */
  static async createOrganization(
    supabase: SupabaseClient,
    userId: string,
    input: CreateOrganizationInput
  ): Promise<{ data: Organization | null; error: string | null }> {

    // Start a transaction by creating organization first
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: input.name,
        description: input.description || null,
        tag: input.tag || null,
        owner_user_id: userId,
      })
      .select()
      .single()

    if (orgError || !org) {
      console.error('Error creating organization:', orgError)
      
      // Check for duplicate tag error
      if (orgError?.code === '23505' && orgError?.message?.includes('unique_organization_tag')) {
        return { data: null, error: 'An organization with this tag already exists' }
      }
      
      return { data: null, error: orgError?.message || 'Failed to create organization' }
    }

    // Add creator as Owner member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: 'Owner',
      })

    if (memberError) {
      console.error('Error adding owner as member:', memberError)
      // Note: In production, you'd want to rollback the org creation
      return { data: null, error: 'Failed to add owner as member' }
    }

    return { data: org, error: null }
  }

  /**
   * Get organization by ID
   */
  static async getOrganizationById(
    organizationId: string
  ): Promise<Organization | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (error) {
      console.error('Error fetching organization:', error)
      return null
    }

    return data
  }

  /**
   * Get organization by ID with user's role
   */
  static async getOrganizationWithRole(
    organizationId: string,
    userId: string
  ): Promise<OrganizationWithRole | null> {
    const supabase = await createClient()

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      console.error('Error fetching organization:', orgError)
      return null
    }

    // Get user's role in this organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single()

    if (memberError || !member) {
      console.error('Error fetching member role:', memberError)
      return null
    }

    // Get member count
    const { count } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    return {
      ...org,
      user_role: member.role,
      member_count: count || 0,
    }
  }

  /**
   * Get all organizations where user is a member
   */
  static async getUserOrganizations(
    supabase: SupabaseClient,
    userId: string
  ): Promise<OrganizationWithRole[]> {

    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)

    if (memberError) {
      console.error('Error fetching user memberships:', memberError)
      return []
    }

    if (!memberships) {
      return []
    }

    if (memberships.length === 0) return []

    const orgIds = memberships.map((m) => m.organization_id)

    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds)

    if (orgError || !organizations) {
      console.error('Error fetching organizations:', orgError)
      return []
    }

    // Combine org data with user's role
    return organizations.map((org) => {
      const membership = memberships.find((m) => m.organization_id === org.id)
      return {
        ...org,
        user_role: membership!.role,
      }
    })
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    organizationId: string,
    input: UpdateOrganizationInput
  ): Promise<Organization | null> {
    const supabase = await createClient()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.tag !== undefined) updateData.tag = input.tag

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return null
    }

    return data
  }

  /**
   * Delete organization
   * Only the owner can delete an organization
   */
  static async deleteOrganization(organizationId: string): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId)

    if (error) {
      console.error('Error deleting organization:', error)
      return false
    }

    return true
  }

  /**
   * Transfer ownership to another member
   */
  static async transferOwnership(
    organizationId: string,
    newOwnerId: string
  ): Promise<boolean> {
    const supabase = await createClient()

    // Update organization owner
    const { error: orgError } = await supabase
      .from('organizations')
      .update({ owner_user_id: newOwnerId, updated_at: new Date().toISOString() })
      .eq('id', organizationId)

    if (orgError) {
      console.error('Error updating organization owner:', orgError)
      return false
    }

    // Update new owner's role to Owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .update({ role: 'Owner', updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('user_id', newOwnerId)

    if (memberError) {
      console.error('Error updating new owner role:', memberError)
      return false
    }

    return true
  }

  // ==================== Member Management ====================

  /**
   * Add a member to an organization
   */
  static async addMember(
    organizationId: string,
    input: AddMemberInput
  ): Promise<OrganizationMember | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: input.user_id,
        role: input.role,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding member:', error)
      return null
    }

    return data
  }

  /**
   * Get all members of an organization with user details
   * Uses service role to bypass RLS
   */
  static async getOrganizationMembers(
    organizationId: string
  ): Promise<OrganizationMemberWithUser[]> {
    const { createServiceRoleClient } = await import('@/lib/server')
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        *,
        user:users!fk_user (
          id,
          name,
          email,
          user_type
        )
      `
      )
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching organization members:', error)
      return []
    }

    return data as any
  }

  /**
   * Get a specific member's details
   */
  static async getMember(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching member:', error)
      return null
    }

    return data
  }

  /**
   * Update a member's role
   */
  static async updateMemberRole(
    organizationId: string,
    userId: string,
    input: UpdateMemberRoleInput
  ): Promise<OrganizationMember | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_members')
      .update({
        role: input.role,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating member role:', error)
      return null
    }

    return data
  }

  /**
   * Remove a member from an organization
   */
  static async removeMember(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing member:', error)
      return false
    }

    return true
  }

  /**
   * Check if user is a member of an organization
   */
  static async isMember(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    const member = await this.getMember(organizationId, userId)
    return member !== null
  }

  /**
   * Get user's role in an organization
   */
  static async getUserRole(
    organizationId: string,
    userId: string
  ): Promise<OrganizationRole | null> {
    const member = await this.getMember(organizationId, userId)
    return member?.role || null
  }
}
