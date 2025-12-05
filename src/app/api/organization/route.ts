import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { OrganizationService } from '@/lib/services/organization.service'
import { UserService } from '@/lib/services/user.service'

/**
 * GET /api/organization
 * Get all organizations where the current user is a member
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get all organizations user is a member of (use auth user ID directly)
    const organizations = await OrganizationService.getUserOrganizations(
      supabase,
      user.id
    )

    return NextResponse.json({
      organizations,
      count: organizations.length,
    })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organization
 * Create a new organization (supports optional logo upload via FormData)
 */
export async function POST(request: NextRequest) {
  try {
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

    // Check if request contains files (multipart/form-data) or just JSON
    const contentType = request.headers.get('content-type') || ''
    const isMultipart = contentType.includes('multipart/form-data')

    let name: string
    let description: string | null = null
    let tag: string | null = null
    let logoFile: File | null = null

    if (isMultipart) {
      const formData = await request.formData()
      const data = JSON.parse(formData.get('data') as string)
      name = data.name
      description = data.description
      tag = data.tag
      const logo = formData.get('logo')
      if (logo instanceof File) {
        logoFile = logo
      }
    } else {
      const body = await request.json()
      name = body.name
      description = body.description
      tag = body.tag
    }

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }

    // Validate tag format if provided
    if (tag && (typeof tag !== 'string' || !/^[A-Z0-9]{2,10}$/.test(tag.trim()))) {
      return NextResponse.json(
        { error: 'Tag must be 2-10 uppercase letters/numbers' },
        { status: 400 }
      )
    }

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

    // Create organization (use auth user ID directly)
    const result = await OrganizationService.createOrganization(
      supabase,
      user.id,
      {
        name: name.trim(),
        description: description?.trim() || undefined,
        tag: tag?.trim() || undefined,
      }
    )

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to create organization' },
        { status: 400 }
      )
    }

    const organization = result.data

    // Upload logo if provided
    if (logoFile) {
      const timestamp = Date.now()
      const sanitizedFileName = logoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${organization.id}/logo/${timestamp}-${sanitizedFileName}`

      const { error: uploadError } = await supabase.storage
        .from('organization-files')
        .upload(storagePath, logoFile, {
          contentType: logoFile.type,
          upsert: false,
        })

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('organization-files')
          .getPublicUrl(storagePath)

        // Update organization with logo URL
        await supabase
          .from('organizations')
          .update({
            logo_url: publicUrl,
            logo_storage_path: storagePath,
          })
          .eq('id', organization.id)

        organization.logo_url = publicUrl
        organization.logo_storage_path = storagePath
      }
    }

    return NextResponse.json(
      {
        message: 'Organization created successfully',
        organization: {
          ...organization,
          user_role: 'Owner',
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
