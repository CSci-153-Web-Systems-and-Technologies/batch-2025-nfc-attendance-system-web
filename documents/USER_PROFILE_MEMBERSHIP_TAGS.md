# User Profile Membership Tags Feature

## Overview
Added organization membership tags display to the user profile page. Users can now see all organizations they belong to with their roles displayed as color-coded tags.

## Changes Made

### 1. New API Endpoint
**File:** `src/app/api/user/memberships/route.ts` (NEW)

- GET endpoint to fetch user's organization memberships
- Includes organization details (id, name, tag)
- Returns memberships with role information
- Ordered by most recent join date

**Response format:**
```json
{
  "memberships": [
    {
      "role": "Admin",
      "organization": {
        "id": "uuid",
        "name": "Faculty of Computing",
        "tag": "FOC"
      }
    }
  ],
  "count": 1
}
```

### 2. Profile Page Updates
**File:** `src/components/profile-page.tsx`

**Added:**
- Import for `OrganizationRole` type
- `UserMembership` interface for typing
- State for memberships and loading status
- `useEffect` hook to fetch memberships on component mount
- `getRoleBadgeColor()` function for role-based colors
- `formatMembershipTag()` function for tag display logic
- New "Organizations" section in profile view

**Display Logic:**
- **Member role:** Shows only organization tag/name (e.g., "FOC")
- **Other roles:** Shows "TAG: ROLE" format (e.g., "FOC: Admin", "FOC: Owner")

**Color Scheme:**
- Owner: Purple (`bg-violet-600`)
- Admin: Blue (`bg-blue-600`)
- Attendance Taker: Cyan (`bg-cyan-600`)
- Member: Gray (`bg-gray-600`)

## Features

### Tag Display Priority
1. If organization has a `tag`, use it (e.g., "FOC")
2. If no tag, use full organization name (e.g., "Faculty of Computing")

### Role-Based Display
```typescript
// Member role - show only org tag
"FOC"

// Owner, Admin, Attendance Taker - show tag with role
"FOC: Admin"
"FOC: Owner"
"FOC: Attendance Taker"
```

### UI/UX
- Tags displayed as rounded pills with white text
- Color-coded by role for quick visual identification
- Responsive flex layout that wraps on smaller screens
- Only shows section if user has memberships
- Loading state while fetching memberships

## Testing

### Test Scenarios

1. **User with no memberships:**
   - Organizations section should not display

2. **User with Member role only:**
   - Tag should show: "FOC" (without role)

3. **User with Admin/Owner role:**
   - Tag should show: "FOC: Admin" or "FOC: Owner"

4. **User in multiple organizations:**
   - All membership tags should display
   - Each with appropriate color and format

5. **Organization without tag:**
   - Should fall back to full organization name

## Files Modified

```
✅ src/app/api/user/memberships/route.ts (NEW)
✅ src/components/profile-page.tsx
```

## Next Steps

- [ ] Test with actual user data
- [ ] Make membership tags clickable to navigate to organization page
- [ ] Add loading skeleton while fetching memberships
- [ ] Consider adding a "Join Organization" button if user has no memberships

## Integration Points

This feature integrates with:
- Organization tag feature (uses `tag` field from organizations table)
- Organization members table (fetches user's roles)
- Profile page (displays membership information)

## Database Query

The API uses this Supabase query:
```typescript
supabase
  .from('organization_members')
  .select(`
    role,
    organizations (
      id,
      name,
      tag
    )
  `)
  .eq('user_id', authUser.id)
  .order('joined_at', { ascending: false })
```

This leverages Supabase's relationship traversal to fetch organization details in a single query.
