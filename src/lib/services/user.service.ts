import { createClient } from '@/lib/server'
import type { CreateUserInput, UpdateUserInput, User, AuthProvider } from '@/types/user'
import type { CanWriteTagResponse, GenerateTagResponse, TagWriteRecord, PrepareTagResponse } from '@/types/tag'

export class UserService {
  /**
    /**
     * Get user by unified tag ID (replaces getUserByNfcTag and getUserByQrCode)
     */
    static async getUserByTag(tagId: string): Promise<User | null> {
      const supabase = await createClient()
    
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tag_id', tagId)
        .single()

      if (error) {
        console.error('Error fetching user by tag:', error)
        return null
      }

      return data
    }

    /**
     * Check if a user can write/generate a new tag based on cooldown period
     */
    static async canWriteTag(userId: string): Promise<CanWriteTagResponse> {
      const supabase = await createClient()
    
      const { data, error } = await supabase.rpc('can_user_write_tag', {
        p_user_id: userId
      })

      if (error) {
        console.error('Error checking tag write eligibility:', error)
        throw new Error('Failed to check tag write eligibility')
      }

      return data as CanWriteTagResponse
    }

    /**
     * Generate a new tag ID for a user
     * Enforces cooldown period via database function
     * @deprecated Use prepareTag + confirmTag for two-phase commit
     */
    static async generateTag(userId: string): Promise<GenerateTagResponse> {
      const supabase = await createClient()
    
      const { data, error } = await supabase.rpc('generate_and_assign_tag', {
        p_user_id: userId
      })

      if (error) {
        console.error('Error generating tag:', error)
        // Check if it's a cooldown error
        if (error.message.includes('Cooldown period not elapsed')) {
          throw new Error(error.message)
        }
        throw new Error('Failed to generate tag')
      }

      return data as GenerateTagResponse
    }

    /**
     * Prepare a new tag ID for writing (Phase 1 of two-phase commit)
     * Generates a temporary tag ID without updating the user's active tag
     * Must be followed by confirmTag after successful NFC write
     */
    static async prepareTag(userId: string): Promise<PrepareTagResponse> {
      const supabase = await createClient()
    
      const { data, error } = await supabase.rpc('prepare_tag_write', {
        p_user_id: userId
      })

      if (error) {
        console.error('Error preparing tag:', error)
        // Check if it's a cooldown error
        if (error.message.includes('Cooldown period not elapsed')) {
          throw new Error(error.message)
        }
        throw new Error('Failed to prepare tag')
      }

      return data as PrepareTagResponse
    }

    /**
     * Confirm a pending tag write (Phase 2 of two-phase commit)
     * Only call this after successfully writing the tag to NFC
     * This updates the user's active tag and records it in history
     */
    static async confirmTag(userId: string, pendingId: string): Promise<GenerateTagResponse> {
      const supabase = await createClient()
    
      const { data, error } = await supabase.rpc('confirm_tag_write', {
        p_user_id: userId,
        p_pending_id: pendingId
      })

      if (error) {
        console.error('Error confirming tag:', error)
        if (error.message.includes('expired')) {
          throw new Error('Tag preparation expired. Please generate a new tag.')
        }
        if (error.message.includes('not found')) {
          throw new Error('Invalid tag preparation ID.')
        }
        throw new Error('Failed to confirm tag write')
      }

      return data as GenerateTagResponse
    }

    /**
     * Get tag write history for a user
     */
    static async getTagWriteHistory(userId: string, limit: number = 10): Promise<TagWriteRecord[]> {
      const supabase = await createClient()
    
      const { data, error } = await supabase.rpc('get_tag_write_history', {
        p_user_id: userId,
        p_limit: limit
      })

      if (error) {
        console.error('Error fetching tag write history:', error)
        return []
      }

      return data || []
    }

    /**
   * Get user profile by ID (which is the auth user ID)
   */
  static async getUserById(userId: string): Promise<User | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user by ID:', error)
      return null
    }

    return data
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Error fetching user by email:', error)
      return null
    }

    return data
  }

  /**
   * Get user by NFC tag ID
    * @deprecated Use getUserByTag instead
   */
  static async getUserByNfcTag(nfcTagId: string): Promise<User | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('nfc_tag_id', nfcTagId)
      .single()

    if (error) {
      console.error('Error fetching user by NFC tag:', error)
      return null
    }

    return data
  }

  /**
   * Get user by QR code data
    * @deprecated Use getUserByTag instead
   */
  static async getUserByQrCode(qrCodeData: string): Promise<User | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('qr_code_data', qrCodeData)
      .single()

    if (error) {
      console.error('Error fetching user by QR code:', error)
      return null
    }

    return data
  }

  /**
   * Create a new user profile
   * @param authUserId - The Supabase auth.users.id
   * @param input - User profile data
   */
  static async createUser(
    authUserId: string,
    input: CreateUserInput
  ): Promise<{ user: User | null; error: string | null }> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: authUserId, // Use auth user ID directly as primary key
        name: input.name,
        email: input.email,
        user_type: input.user_type,
        auth_provider: input.auth_provider,
        has_password: input.has_password,
        nfc_tag_id: input.nfc_tag_id || null,
        qr_code_data: input.qr_code_data || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return { user: null, error: error.message }
    }

    return { user: data, error: null }
  }

  /**
   * Update user profile
   */
  static async updateUser(
    userId: string,
    input: UpdateUserInput
  ): Promise<{ user: User | null; error: string | null }> {
    const supabase = await createClient()

    const updateData: Record<string, any> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.user_type !== undefined) updateData.user_type = input.user_type
    if (input.nfc_tag_id !== undefined) updateData.nfc_tag_id = input.nfc_tag_id
    if (input.qr_code_data !== undefined) updateData.qr_code_data = input.qr_code_data

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return { user: null, error: error.message }
    }

    return { user: data, error: null }
  }

  /**
   * Mark that user has set a password (for OAuth users who add password later)
   */
  static async markPasswordSet(userId: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('users')
      .update({ has_password: true })
      .eq('id', userId)

    if (error) {
      console.error('Error marking password as set:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  }

  /**
   * Delete user profile
   */
  static async deleteUser(userId: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Error deleting user:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  }

  /**
   * Check if user profile exists
   */
  static async hasProfile(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId)
    return user !== null
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(): Promise<User[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all users:', error)
      return []
    }

    return data || []
  }

  /**
   * Check if NFC tag is available
   */
  static async isNfcTagAvailable(nfcTagId: string, excludeUserId?: string): Promise<boolean> {
    const supabase = await createClient()
    
    let query = supabase
      .from('users')
      .select('id')
      .eq('nfc_tag_id', nfcTagId)

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which means tag is available
      console.error('Error checking NFC tag availability:', error)
      return false
    }

    return data === null
  }

  /**
   * Check if user can reset password
   * OAuth users without password set should be directed to set password instead
   */
  static async canResetPassword(email: string): Promise<{
    canReset: boolean
    reason?: string
    authProvider?: AuthProvider
    hasPassword?: boolean
  }> {
    const user = await this.getUserByEmail(email)
    
    if (!user) {
      return { 
        canReset: false, 
        reason: 'No account found with this email address' 
      }
    }

    if (user.has_password) {
      return { 
        canReset: true,
        authProvider: user.auth_provider,
        hasPassword: true
      }
    }

    // OAuth user without password
    return {
      canReset: false,
      reason: `This account was created using ${user.auth_provider}. You can set a password to enable password login.`,
      authProvider: user.auth_provider,
      hasPassword: false
    }
  }

  /**
   * Determine auth provider from Supabase auth user
   */
  static getAuthProviderFromUser(authUser: any): AuthProvider {
    // Check app_metadata or user_metadata for provider info
    const provider = authUser.app_metadata?.provider || authUser.user_metadata?.provider
    
    if (provider && ['email', 'google', 'github', 'azure', 'facebook'].includes(provider)) {
      return provider as AuthProvider
    }

    // Fallback: if email confirmed and no provider, assume email
    return authUser.email_confirmed_at ? 'email' : 'email'
  }

  /**
   * Check if auth user has password set
   */
  static authUserHasPassword(authUser: any): boolean {
    // If user signed up with email/password, they have a password
    // OAuth users will not have password initially
    const provider = this.getAuthProviderFromUser(authUser)
    return provider === 'email'
  }
}
