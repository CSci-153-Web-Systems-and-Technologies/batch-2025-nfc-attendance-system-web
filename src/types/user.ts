// User types for the NFC Attendance System

export type UserType = 'Student' | 'Faculty' | 'Admin'

export interface User {
  id: string
  auth_id: string
  name: string
  email: string
  user_type: UserType
  nfc_tag_id: string | null
  qr_code_data: string | null
  created_at: string
  updated_at: string
}

export interface CreateUserInput {
  name: string
  email: string
  user_type: UserType
  nfc_tag_id?: string
  qr_code_data?: string
}

export interface UpdateUserInput {
  name?: string
  user_type?: UserType
  nfc_tag_id?: string
  qr_code_data?: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  user_type: UserType
  nfc_tag_id: string | null
  qr_code_data: string | null
}
