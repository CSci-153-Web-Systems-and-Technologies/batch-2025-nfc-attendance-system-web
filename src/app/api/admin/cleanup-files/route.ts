import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/server'
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'

// POST /api/admin/cleanup-files - Clean up expired event files (admin/owner only)
export async function POST(request: NextRequest) {
  try {
    // Use regular client for auth check
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const userProfile = await UserService.getUserById(user.id)
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is an owner or admin of at least one organization
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', userProfile.id)
      .in('role', ['Owner', 'Admin'])

    if (memberError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Must be an organization Owner or Admin.' },
        { status: 403 }
      )
    }

    // Use service role client for cleanup (bypasses RLS)
    const serviceSupabase = createServiceRoleClient()

    // Call the cleanup function
    const { data: cleanupResult, error: cleanupError } = await serviceSupabase.rpc(
      'cleanup_expired_event_files'
    )

    if (cleanupError) {
      console.error('Cleanup function error:', cleanupError)
      return NextResponse.json(
        { error: 'Failed to execute cleanup function', details: cleanupError.message },
        { status: 500 }
      )
    }

    // Delete actual files from Storage based on the storage_paths returned
    const storagePaths = cleanupResult?.storage_paths || []
    let storageDeletedCount = 0
    const storageErrors = []

    if (storagePaths.length > 0) {
      const { data: deleteData, error: deleteError } = await serviceSupabase.storage
        .from('event-files')
        .remove(storagePaths)

      if (deleteError) {
        storageErrors.push(deleteError.message)
      } else {
        storageDeletedCount = deleteData?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      filesDeleted: cleanupResult?.files_deleted || 0,
      storageFilesDeleted: storageDeletedCount,
      storagePaths,
      storageErrors: storageErrors.length > 0 ? storageErrors : undefined,
      message: cleanupResult?.message || 'Cleanup completed',
      executedBy: {
        userId: userProfile.id,
        userName: userProfile.name,
        email: userProfile.email,
      },
      executedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in cleanup endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to clean up expired files' },
      { status: 500 }
    )
  }
}

// GET /api/admin/cleanup-files - Preview files eligible for cleanup (admin/owner only)
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

    // Get user profile
    const userProfile = await UserService.getUserById(user.id)
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is an owner or admin of at least one organization
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', userProfile.id)
      .in('role', ['Owner', 'Admin'])

    if (memberError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Must be an organization Owner or Admin.' },
        { status: 403 }
      )
    }

    // Query files eligible for deletion (events that ended more than 3 days ago)
    const { data: eligibleFiles, error: queryError } = await supabase
      .from('event_files')
      .select(`
        id,
        file_name,
        file_size_bytes,
        file_type,
        uploaded_at,
        events!inner(
          id,
          event_name,
          date,
          organization_id
        )
      `)
      .lt('events.date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())

    if (queryError) {
      return NextResponse.json(
        { error: 'Failed to query eligible files', details: queryError.message },
        { status: 500 }
      )
    }

    // Calculate total size
    const totalSizeBytes = eligibleFiles?.reduce(
      (sum, file) => sum + (file.file_size_bytes || 0),
      0
    ) || 0

    return NextResponse.json({
      eligibleFiles: eligibleFiles || [],
      count: eligibleFiles?.length || 0,
      totalSizeBytes,
      totalSizeMB: (totalSizeBytes / 1024 / 1024).toFixed(2),
      message: `Found ${eligibleFiles?.length || 0} file(s) eligible for cleanup`,
    })
  } catch (error) {
    console.error('Error previewing cleanup:', error)
    return NextResponse.json(
      { error: 'Failed to preview cleanup' },
      { status: 500 }
    )
  }
}
