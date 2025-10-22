import { createClient } from '@/lib/server'
import type { CreateUserInput, UpdateUserInput, User } from '@/types/user'

export class UserService {
  /**
   * Get user profile by auth ID
   */
  static async getUserByAuthId(authId: string): Promise<User | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single()

    if (error) {
      console.error('Error fetching user by auth ID:', error)
      return null
    }

    return data
  }

  /**
   * Get user profile by user ID
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
   */
  static async createUser(
    authId: string,
    input: CreateUserInput
  ): Promise<{ user: User | null; error: string | null }> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('users')
      .insert({
        auth_id: authId,
        name: input.name,
        email: input.email,
        user_type: input.user_type,
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
   * Check if user profile exists for auth user
   */
  static async hasProfile(authId: string): Promise<boolean> {
    const user = await this.getUserByAuthId(authId)
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
}
