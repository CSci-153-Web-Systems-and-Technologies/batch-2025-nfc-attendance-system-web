import { createClient } from '@/lib/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/user/search
 * Search all users by name or email for manual attendance entry
 * Query params:
 * - q: Search query (required, min 2 chars)
 * - limit: Max results to return (default 10, max 50)
 * - exclude_org_members: Organization ID to exclude existing members (optional)
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const query = searchParams.get('q')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
  const excludeOrgMembers = searchParams.get('exclude_org_members')

  // Validate authenticated user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate search query
  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Search query must be at least 2 characters' },
      { status: 400 }
    )
  }

  const searchTerm = query.trim().toLowerCase()

  try {
    // Build query - search by name or email
    let dbQuery = supabase
      .from('users')
      .select('id, name, email, user_type, tag_id')
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('name', { ascending: true })
      .limit(limit)

    const { data: users, error: searchError } = await dbQuery

    if (searchError) {
      console.error('Error searching users:', searchError)
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      )
    }

    // If excludeOrgMembers is specified, filter out existing members
    let filteredUsers = users || []
    if (excludeOrgMembers && filteredUsers.length > 0) {
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', excludeOrgMembers)

      if (members) {
        const memberIds = new Set(members.map(m => m.user_id))
        filteredUsers = filteredUsers.map(user => ({
          ...user,
          is_member: memberIds.has(user.id)
        }))
      }
    } else {
      // Add is_member field defaulting to false (unknown without org context)
      filteredUsers = filteredUsers.map(user => ({
        ...user,
        is_member: false
      }))
    }

    return NextResponse.json({
      users: filteredUsers,
      count: filteredUsers.length
    })
  } catch (error) {
    console.error('Unexpected error searching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
