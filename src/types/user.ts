// User types for the NFC Attendance System

export type UserType = 'Student' | 'Faculty' | 'Admin'
export type AuthProvider = 'email' | 'google' | 'github' | 'azure' | 'facebook'

/**
 * User record from database
 * Note: id field is the Supabase auth.users.id (no separate ID needed)
 */
export interface User {
  id: string // This is the Supabase auth user ID (formerly auth_id)
  name: string
  email: string
  user_type: UserType
  auth_provider: AuthProvider
  has_password: boolean
  nfc_tag_id: string | null
  qr_code_data: string | null
  created_at: string
  updated_at: string
}

export interface CreateUserInput {
  name: string
  email: string
  user_type: UserType
  auth_provider: AuthProvider
  has_password: boolean
  nfc_tag_id?: string
  qr_code_data?: string
}

export interface UpdateUserInput {
  name?: string
  user_type?: UserType
  nfc_tag_id?: string
  qr_code_data?: string
}

/**
 * User profile for display purposes
 */
export interface UserProfile {
  id: string
  name: string
  email: string
  user_type: UserType
  auth_provider: AuthProvider
  has_password: boolean
  nfc_tag_id: string | null
  qr_code_data: string | null
}

/**
 * Auth provider metadata for handling different login methods
 */
export interface AuthProviderInfo {
  provider: AuthProvider
  can_set_password: boolean
  has_password: boolean
}
