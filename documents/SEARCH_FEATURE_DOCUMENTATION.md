# Advanced Organization Search Feature

## Overview
The organization search feature provides a powerful way for users to discover and join organizations with advanced filtering, pagination, and sorting capabilities.

## Features Implemented

### 1. **Advanced Search Query**
- **Text Search**: Searches across organization name and description
- **Case-insensitive**: Uses PostgreSQL `ILIKE` for flexible matching
- **Partial Matching**: Finds organizations with any part of the search term

### 2. **Pagination**
- Default: 10 results per page
- Maximum: 50 results per page
- Shows page indicators with navigation controls
- Displays total count and page numbers

### 3. **Sorting Options**
- **Sort by Name**: Alphabetical organization names
- **Sort by Created Date**: Newest or oldest first
- **Sort by Member Count**: Most or least popular (future enhancement)
- **Sort Order**: Ascending or Descending

### 4. **Advanced Filters**
- **Member Count Range**: Filter by minimum and maximum member count
- **Exclude Joined Organizations**: Hide organizations user is already a member of
- **Collapsible Filter Panel**: Clean UI with show/hide filters button

### 5. **Smart Result Display**
- **Membership Status Badges**: Shows if user is already a member
- **Organization Details**: Name, description, member count, creation date
- **Action Buttons**: 
  - "Join" for non-member organizations
  - "View" for organizations user is already a member of
- **Loading States**: Proper loading indicators during search and join actions

### 6. **User Experience Enhancements**
- **Enter Key Support**: Press Enter to search
- **Auto-refresh**: Results update when filters change
- **Responsive Design**: Works on all screen sizes
- **Empty States**: Helpful messages when no results found or before searching

## API Endpoints

### Search Organizations
```
GET /api/organization/search
```

#### Query Parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | "" | Search query for name/description |
| `page` | number | 1 | Page number (min: 1) |
| `limit` | number | 10 | Results per page (max: 50) |
| `sort` | string | "name" | Sort field: `name`, `created_at`, `member_count` |
| `order` | string | "asc" | Sort order: `asc` or `desc` |
| `min_members` | number | - | Minimum member count filter |
| `max_members` | number | - | Maximum member count filter |
| `exclude_joined` | boolean | false | Exclude organizations user is a member of |

#### Response Format:
```json
{
  "results": [
    {
      "id": "uuid",
      "name": "Organization Name",
      "description": "Description text",
      "owner_user_id": "uuid",
      "created_at": "2025-10-30T00:00:00Z",
      "updated_at": "2025-10-30T00:00:00Z",
      "member_count": 15,
      "is_member": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "total_pages": 5,
    "has_next_page": true,
    "has_previous_page": false
  },
  "filters": {
    "query": "tech",
    "sort_field": "name",
    "sort_order": "asc",
    "min_members": 5,
    "max_members": 100,
    "exclude_joined": true
  }
}
```

### Join Organization
```
POST /api/membership/request
```

#### Request Body:
```json
{
  "organization_id": "uuid"
}
```

#### Response:
```json
{
  "message": "Successfully joined organization",
  "membership": {
    "id": "uuid",
    "organization_id": "uuid",
    "user_id": "uuid",
    "role": "Member",
    "joined_at": "2025-10-30T00:00:00Z"
  },
  "organization": {
    "id": "uuid",
    "name": "Organization Name"
  }
}
```

## Technical Implementation

### Backend (API Route)
**File**: `src/app/api/organization/search/route.ts`

Key features:
- Supabase query builder for complex filtering
- User authentication check
- Member count calculation from relationships
- Pagination metadata generation
- Membership status enrichment

### Frontend (React Component)
**File**: `src/components/organizations/search-organizations-view.tsx`

Key features:
- State management for search, filters, and pagination
- Auto-refresh on filter changes
- Optimistic UI updates
- Loading and error states
- Responsive design with Tailwind CSS

## Database Queries

### Search Query Pattern
```sql
SELECT 
  o.*,
  COUNT(om.id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
WHERE 
  (o.name ILIKE '%search%' OR o.description ILIKE '%search%')
  AND o.id NOT IN (user's organizations if exclude_joined=true)
GROUP BY o.id
ORDER BY o.name ASC
LIMIT 10 OFFSET 0;
```

### Membership Check
```sql
SELECT organization_id
FROM organization_members
WHERE user_id = 'current_user_id';
```

## Future Enhancements

### 1. **Full-Text Search**
- Implement PostgreSQL full-text search with `tsvector`
- Add search ranking/relevance scoring
- Support for search operators (AND, OR, NOT)

### 2. **Approval Workflow**
- Create `organization_join_requests` table
- Add pending request status
- Implement admin approval system
- Email notifications for requests

### 3. **Additional Filters**
- Filter by tags/categories
- Filter by location
- Filter by activity level (recent events)
- Filter by public/private status

### 4. **Search Analytics**
- Track popular searches
- Suggest similar organizations
- "People also joined" recommendations

### 5. **Performance Optimizations**
- Add database indexes on searchable fields
- Implement caching for popular searches
- Use database materialized views for complex aggregations
- Add infinite scroll option

### 6. **User Experience**
- Search history
- Saved searches
- Search result bookmarking
- Share search results

## Usage Example

```typescript
// Basic search
const response = await fetch('/api/organization/search?q=tech&page=1&limit=10');

// Advanced search with filters
const response = await fetch(
  '/api/organization/search?' + 
  'q=tech&' +
  'page=1&' +
  'limit=20&' +
  'sort=member_count&' +
  'order=desc&' +
  'min_members=10&' +
  'exclude_joined=true'
);

const data = await response.json();
console.log(data.results); // Array of organizations
console.log(data.pagination); // Pagination info
```

## Testing Checklist

- [ ] Search with empty query returns all organizations
- [ ] Search with text finds matching organizations
- [ ] Pagination works correctly
- [ ] Sorting by name/date/member count works
- [ ] Min/max member filters work correctly
- [ ] Exclude joined organizations filter works
- [ ] Join button adds user to organization
- [ ] Member status badge appears correctly
- [ ] Loading states display properly
- [ ] Empty states show appropriate messages
- [ ] Enter key triggers search
- [ ] Filter changes trigger auto-search
- [ ] Navigation between pages maintains filters

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `401`: Unauthorized (not logged in)
- `404`: User profile or organization not found
- `500`: Internal server error

Errors are logged to console and user-friendly messages are displayed.

## Security Considerations

- All requests require authentication
- User can only see public organization data
- RLS (Row Level Security) policies applied at database level
- No sensitive data exposed in search results
- SQL injection prevented by parameterized queries
