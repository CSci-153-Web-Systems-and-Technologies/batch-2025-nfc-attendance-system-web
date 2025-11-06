// Join Request types for the NFC Attendance System

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected'

export interface JoinRequest {
  id: string
  organization_id: string
  user_id: string
  status: JoinRequestStatus
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

export interface JoinRequestWithUser extends JoinRequest {
  user: {
    id: string
    name: string
    email: string
    user_type: string
  }
}

export interface JoinRequestWithOrganization extends JoinRequest {
  organization: {
    id: string
    name: string
    tag: string | null
  }
}

export interface CreateJoinRequestInput {
  organization_id: string
}

export interface ReviewJoinRequestInput {
  request_id: string
  action: 'approve' | 'reject'
}
