import { NextResponse } from 'next/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { hasPermission, OrganizationRole } from '@/types/organization'

/**
 * Authorization result containing user's role and org info
 */
export interface AuthorizationContext {
  userId: string
  organizationId: string
  role: OrganizationRole
  isOwner: boolean
}

/**
 * Check if user has required permission in an organization
 * Returns AuthorizationContext if authorized, NextResponse error if not
 */
export async function requireOrgPermission(
  userId: string,
  organizationId: string,
  permission: keyof typeof import('@/types/organization').ROLE_PERMISSIONS.Owner
): Promise<AuthorizationContext | NextResponse> {
  // Check if user is a member
  const role = await OrganizationService.getUserRole(organizationId, userId)

  if (!role) {
    return NextResponse.json(
      { error: 'You are not a member of this organization' },
      { status: 403 }
    )
  }

  // Check if user has the required permission
  if (!hasPermission(role, permission)) {
    return NextResponse.json(
      { error: `You do not have permission to perform this action. Required permission: ${permission}` },
      { status: 403 }
    )
  }

  const org = await OrganizationService.getOrganizationById(organizationId)

  return {
    userId,
    organizationId,
    role,
    isOwner: org?.owner_user_id === userId,
  }
}

/**
 * Check if user is the organization owner
 */
export async function requireOrgOwner(
  userId: string,
  organizationId: string
): Promise<AuthorizationContext | NextResponse> {
  const org = await OrganizationService.getOrganizationById(organizationId)

  if (!org) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }

  if (org.owner_user_id !== userId) {
    return NextResponse.json(
      { error: 'Only the organization owner can perform this action' },
      { status: 403 }
    )
  }

  const role = await OrganizationService.getUserRole(organizationId, userId)

  return {
    userId,
    organizationId,
    role: role || 'Owner',
    isOwner: true,
  }
}

/**
 * Check if user is a member of an organization (any role)
 */
export async function requireOrgMembership(
  userId: string,
  organizationId: string
): Promise<AuthorizationContext | NextResponse> {
  const role = await OrganizationService.getUserRole(organizationId, userId)

  if (!role) {
    return NextResponse.json(
      { error: 'You are not a member of this organization' },
      { status: 403 }
    )
  }

  const org = await OrganizationService.getOrganizationById(organizationId)

  return {
    userId,
    organizationId,
    role,
    isOwner: org?.owner_user_id === userId,
  }
}

/**
 * Check if user has specific role(s) in an organization
 */
export async function requireOrgRole(
  userId: string,
  organizationId: string,
  allowedRoles: OrganizationRole[]
): Promise<AuthorizationContext | NextResponse> {
  const role = await OrganizationService.getUserRole(organizationId, userId)

  if (!role) {
    return NextResponse.json(
      { error: 'You are not a member of this organization' },
      { status: 403 }
    )
  }

  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
      { error: `Access denied. Required roles: ${allowedRoles.join(', ')}` },
      { status: 403 }
    )
  }

  const org = await OrganizationService.getOrganizationById(organizationId)

  return {
    userId,
    organizationId,
    role,
    isOwner: org?.owner_user_id === userId,
  }
}

/**
 * Helper to check authorization result
 */
export function isAuthorized(
  result: AuthorizationContext | NextResponse
): result is AuthorizationContext {
  return 'role' in result
}
