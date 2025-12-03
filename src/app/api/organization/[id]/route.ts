import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { UserService } from '@/lib/services/user.service'
import {
  requireOrgPermission,
  requireOrgOwner,
  requireOrgMembership,
  isAuthorized,
} from '@/lib/authorization'

/**
 * GET /api/organization/[id]
 * Get organization details with user's role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user profile exists
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user is a member (use auth user ID directly)
    const authResult = await requireOrgMembership(user.id, organizationId)

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Get organization with role (use auth user ID directly)
    const organization = await OrganizationService.getOrganizationWithRole(
      organizationId,
      user.id
    )

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Error fetching organization:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/organization/[id]
 * Update organization details (supports logo upload via FormData)
 * Requires: Owner or Admin role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user profile exists
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check permission (use auth user ID directly)
    const authResult = await requireOrgPermission(
      user.id,
      organizationId,
      'canManageOrganization'
    )

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Check if request contains files (multipart/form-data) or just JSON
    const contentType = request.headers.get('content-type') || ''
    const isMultipart = contentType.includes('multipart/form-data')

    let body: any
    let logoFile: File | null = null
    let removeLogo = false

    if (isMultipart) {
      const formData = await request.formData()
      body = JSON.parse(formData.get('data') as string)
      const logo = formData.get('logo')
      if (logo instanceof File) {
        logoFile = logo
      }
      removeLogo = formData.get('removeLogo') === 'true'
    } else {
      body = await request.json()
    }

    const { name, description, tag } = body

    // Validate logo if provided
    if (logoFile) {
      if (!['image/jpeg', 'image/png'].includes(logoFile.type)) {
        return NextResponse.json(
          { error: 'Logo must be JPEG or PNG format' },
          { status: 400 }
        )
      }
      if (logoFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Logo file size must not exceed 5MB' },
          { status: 400 }
        )
      }
    }

    // Validate input
    const updateData: any = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid organization name' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (tag !== undefined) {
      if (tag && (typeof tag !== 'string' || !/^[A-Z0-9]{2,10}$/.test(tag.trim()))) {
        return NextResponse.json(
          { error: 'Tag must be 2-10 uppercase letters/numbers' },
          { status: 400 }
        )
      }
      updateData.tag = tag?.trim() || null
    }

    // Get current organization to check for existing logo
    const { data: currentOrg } = await supabase
      .from('organizations')
      .select('logo_url, logo_storage_path')
      .eq('id', organizationId)
      .single()

    // Handle logo removal
    if (removeLogo && currentOrg?.logo_storage_path) {
      await supabase.storage
        .from('organization-files')
        .remove([currentOrg.logo_storage_path])
      updateData.logo_url = null
      updateData.logo_storage_path = null
    }

    // Handle logo upload
    if (logoFile) {
      // Delete old logo if exists
      if (currentOrg?.logo_storage_path) {
        await supabase.storage
          .from('organization-files')
          .remove([currentOrg.logo_storage_path])
      }

      const timestamp = Date.now()
      const sanitizedFileName = logoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${organizationId}/logo/${timestamp}-${sanitizedFileName}`

      const { error: uploadError } = await supabase.storage
        .from('organization-files')
        .upload(storagePath, logoFile, {
          contentType: logoFile.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Error uploading logo:', uploadError)
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('organization-files')
          .getPublicUrl(storagePath)

        updateData.logo_url = publicUrl
        updateData.logo_storage_path = storagePath
      }
    }

    // Update organization
    const organization = await OrganizationService.updateOrganization(
      organizationId,
      updateData
    )

    if (!organization) {
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Organization updated successfully',
      organization,
    })
  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organization/[id]
 * Delete organization
 * Requires: Owner role only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user profile exists
    const userProfile = await UserService.getUserById(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user is owner (use auth user ID directly)
    const authResult = await requireOrgOwner(user.id, organizationId)

    if (!isAuthorized(authResult)) {
      return authResult
    }

    // Delete organization
    const success = await OrganizationService.deleteOrganization(organizationId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Organization deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    )
  }
}
