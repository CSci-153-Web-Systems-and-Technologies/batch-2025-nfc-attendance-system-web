import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'

// GET /api/event/[id]/files - Get files for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
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

    // Get event files (RLS will enforce attendance-based access)
    const { data: files, error: filesError } = await supabase
      .from('event_files')
      .select('*')
      .eq('event_id', eventId)
      .order('uploaded_at', { ascending: false })

    if (filesError) {
      return NextResponse.json(
        { error: 'Failed to fetch files', details: filesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      files: files || [],
      count: files?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    )
  }
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB in bytes
const MAX_FILES_PER_EVENT = 10
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

// POST /api/event/[id]/files - Add files to an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
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

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, organization_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user has permission to add files (Admin, Owner, or Attendance Taker)
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', event.organization_id)
      .eq('user_id', userProfile.id)
      .single()

    if (
      !membership ||
      !['Owner', 'Admin', 'Attendance Taker'].includes(membership.role)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions to add files to this event' },
        { status: 403 }
      )
    }

    // Check current file count
    const { data: currentFileCount } = await supabase.rpc(
      'get_event_file_count',
      { p_event_id: eventId }
    )

    // Parse multipart form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Check total file count doesn't exceed limit
    const totalFiles = (currentFileCount || 0) + files.length
    if (totalFiles > MAX_FILES_PER_EVENT) {
      return NextResponse.json(
        {
          error: `Cannot add ${files.length} file(s). Event has ${currentFileCount} files and limit is ${MAX_FILES_PER_EVENT}.`,
        },
        { status: 400 }
      )
    }

    // Validate each file
    const validationErrors: { fileName: string; error: string }[] = []
    const validFiles: File[] = []

    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push({
          fileName: file.name,
          error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 20MB limit`,
        })
        continue
      }

      // Check MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        validationErrors.push({
          fileName: file.name,
          error: `File type ${file.type} not allowed. Allowed: PDF, Word documents, JPG, PNG`,
        })
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid files to upload',
          validationErrors,
        },
        { status: 400 }
      )
    }

    // Upload files to Supabase Storage
    const uploadedFiles = []
    const uploadErrors = []

    for (const file of validFiles) {
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${event.organization_id}/${eventId}/${timestamp}-${sanitizedFileName}`

      // Upload to Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('event-files')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (storageError) {
        uploadErrors.push({
          fileName: file.name,
          error: storageError.message,
        })
        continue
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('event-files').getPublicUrl(storagePath)

      // Determine file type
      const fileType = file.type.startsWith('image/') ? 'image' : 'document'

      // Insert metadata into database
      const { data: fileRecord, error: dbError } = await supabase
        .from('event_files')
        .insert({
          event_id: eventId,
          file_name: file.name,
          file_url: publicUrl,
          storage_path: storagePath,
          file_type: fileType,
          file_size_bytes: file.size,
          mime_type: file.type,
          uploaded_by: userProfile.id,
        })
        .select()
        .single()

      if (dbError) {
        // Rollback storage upload
        await supabase.storage.from('event-files').remove([storagePath])
        uploadErrors.push({
          fileName: file.name,
          error: dbError.message,
        })
        continue
      }

      uploadedFiles.push(fileRecord)
    }

    return NextResponse.json({
      success: true,
      uploadedFiles,
      uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
      validationErrors:
        validationErrors.length > 0 ? validationErrors : undefined,
      message: `Successfully uploaded ${uploadedFiles.length} of ${files.length} file(s)`,
    })
  } catch (error) {
    console.error('Error uploading files:', error)
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}

// DELETE /api/event/[id]/files - Delete specific files from an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
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

    // Parse request body
    const body = await request.json()
    const { fileIds } = body as { fileIds: string[] }

    if (!fileIds || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'No file IDs provided' },
        { status: 400 }
      )
    }

    // Get files to delete with permission check
    const { data: filesToDelete, error: filesError } = await supabase
      .from('event_files')
      .select('*, events!inner(organization_id, created_by)')
      .eq('event_id', eventId)
      .in('id', fileIds)

    if (filesError || !filesToDelete || filesToDelete.length === 0) {
      return NextResponse.json(
        { error: 'Files not found or access denied' },
        { status: 404 }
      )
    }

    // Check permissions (uploader, event creator, or org admin/owner)
    const event = filesToDelete[0].events
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', event.organization_id)
      .eq('user_id', userProfile.id)
      .single()

    const isOrgAdmin =
      membership && ['Owner', 'Admin'].includes(membership.role)
    const isEventCreator = event.created_by === userProfile.id

    // Verify user can delete each file
    const deletableFiles = filesToDelete.filter(
      (file) =>
        file.uploaded_by === userProfile.id || isEventCreator || isOrgAdmin
    )

    if (deletableFiles.length === 0) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete these files' },
        { status: 403 }
      )
    }

    // Delete files from Storage and database
    const deletedFiles = []
    const deleteErrors = []

    for (const file of deletableFiles) {
      // Delete from Storage
      const { error: storageError } = await supabase.storage
        .from('event-files')
        .remove([file.storage_path])

      if (storageError) {
        deleteErrors.push({
          fileId: file.id,
          fileName: file.file_name,
          error: storageError.message,
        })
        continue
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('event_files')
        .delete()
        .eq('id', file.id)

      if (dbError) {
        deleteErrors.push({
          fileId: file.id,
          fileName: file.file_name,
          error: dbError.message,
        })
        continue
      }

      deletedFiles.push({
        id: file.id,
        file_name: file.file_name,
      })
    }

    return NextResponse.json({
      success: true,
      deletedFiles,
      deleteErrors: deleteErrors.length > 0 ? deleteErrors : undefined,
      message: `Successfully deleted ${deletedFiles.length} of ${fileIds.length} file(s)`,
    })
  } catch (error) {
    console.error('Error deleting files:', error)
    return NextResponse.json(
      { error: 'Failed to delete files' },
      { status: 500 }
    )
  }
}
