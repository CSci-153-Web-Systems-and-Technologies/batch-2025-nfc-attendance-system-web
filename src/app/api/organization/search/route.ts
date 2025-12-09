import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { UserService } from '@/lib/services/user.service'

/**
 * GET /api/organization/search
 * Advanced search for organizations with pagination, filtering, and sorting
 * 
 * Query parameters:
 * - q: Search query (searches name and description)
 * - page: Page number (default: 1) - alternative to offset
 * - offset: Offset for pagination (default: 0)
 * - limit: Results per page (default: 10, max: 50)
 * - sort: Sort field (name, created_at, member_count)
 * - order: Sort order (asc, desc) (default: asc)
 * - min_members: Minimum member count filter
 * - max_members: Maximum member count filter
 * - exclude_joined: Exclude organizations user is already a member of (default: false)
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim() || ''
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    // Support both offset-based and page-based pagination
    const offsetParam = searchParams.get('offset')
    const pageParam = searchParams.get('page')
    const offset = offsetParam !== null 
      ? Math.max(0, parseInt(offsetParam))
      : pageParam !== null 
        ? (Math.max(1, parseInt(pageParam)) - 1) * limit
        : 0
    const sortField = searchParams.get('sort') || 'name'
    const sortOrder = searchParams.get('order') === 'desc' ? 'desc' : 'asc'
    const minMembers = searchParams.get('min_members') ? parseInt(searchParams.get('min_members')!) : undefined
    const maxMembers = searchParams.get('max_members') ? parseInt(searchParams.get('max_members')!) : undefined
    const excludeJoined = searchParams.get('exclude_joined') === 'true'

    // Always get user's organizations to mark them as joined in results
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)

    const userOrgIds = memberships?.map(m => m.organization_id) || []

    // Get user's pending join requests
    const { data: pendingRequests } = await supabase
      .from('organization_join_requests')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'pending')

    const pendingOrgIds = pendingRequests?.map(r => r.organization_id) || []

    // Build the base query
    let queryBuilder = supabase
      .from('organizations')
      .select('*, organization_members(count)', { count: 'exact' })

    // Apply search filter using PostgreSQL full-text search or ILIKE
    if (query) {
      // Use OR condition to search in both name and description
      // Using ILIKE for case-insensitive pattern matching
      queryBuilder = queryBuilder.or(
        `name.ilike.%${query}%,description.ilike.%${query}%`
      )
    }

    // Exclude organizations user is already a member of
    if (excludeJoined && userOrgIds.length > 0) {
      queryBuilder = queryBuilder.not('id', 'in', `(${userOrgIds.join(',')})`)
    }

    // Get total count for pagination (before limit/offset)
    const { count: totalCount } = await queryBuilder

    // Apply sorting
    let orderColumn = 'name'
    if (sortField === 'created_at') {
      orderColumn = 'created_at'
    } else if (sortField === 'name') {
      orderColumn = 'name'
    }
    
    queryBuilder = queryBuilder.order(orderColumn, { ascending: sortOrder === 'asc' })

    // Apply pagination
    queryBuilder = queryBuilder.range(offset, offset + limit - 1)

    // Execute query
    const { data: organizations, error } = await queryBuilder

    if (error) {
      console.error('Error searching organizations:', error)
      return NextResponse.json(
        { error: 'Failed to search organizations' },
        { status: 500 }
      )
    }

    // Process results: count members and apply member filters
    let results = organizations?.map(org => {
      // Count members from the relation
      // When using (count) in select, Supabase returns [{count: N}]
      const memberCount = Array.isArray(org.organization_members) && org.organization_members.length > 0
        ? (org.organization_members[0] as { count: number })?.count ?? 0
        : 0

      // Remove the organization_members array from the result
      const { organization_members, ...orgData } = org

      return {
        ...orgData,
        member_count: memberCount,
      }
    }) || []

    // Apply member count filters
    if (minMembers !== undefined) {
      results = results.filter(org => org.member_count >= minMembers)
    }
    if (maxMembers !== undefined) {
      results = results.filter(org => org.member_count <= maxMembers)
    }

    // Add membership status and pending request status to results
    const enrichedResults = results.map(org => ({
      ...org,
      is_member: userOrgIds.includes(org.id),
      has_pending_request: pendingOrgIds.includes(org.id),
    }))

    // Calculate pagination metadata
    const totalPages = Math.ceil((totalCount || 0) / limit)
    const currentPage = Math.floor(offset / limit) + 1
    const hasNextPage = offset + enrichedResults.length < (totalCount || 0)
    const hasPreviousPage = offset > 0

    return NextResponse.json({
      results: enrichedResults,
      pagination: {
        page: currentPage,
        offset,
        limit,
        total: totalCount || 0,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_previous_page: hasPreviousPage,
        has_more: hasNextPage,
      },
      filters: {
        query,
        sort_field: sortField,
        sort_order: sortOrder,
        min_members: minMembers,
        max_members: maxMembers,
        exclude_joined: excludeJoined,
      },
    })
  } catch (error) {
    console.error('Error in organization search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
