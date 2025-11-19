# Tag Confirmation System - Implementation Guide

## Overview

This implementation adds a **two-phase commit system** for tag writing to prevent database/NFC desynchronization. Previously, if the NFC write failed after the database was updated, users would have a tag ID in the system that didn't match their physical tag.

## What Changed

### Security Improvement
**BEFORE:** 
1. Generate tag ID → Save to database
2. Try to write to NFC
3. ❌ If NFC fails, database has wrong tag ID

**AFTER:**
1. Prepare tag ID → Save as pending (not active yet)
2. Write to NFC
3. ✅ If successful → Confirm and activate
4. ❌ If failed → Pending tag expires, no database corruption

## New Database Components

### Table: `user_tag_pending`
Stores temporary tag IDs awaiting NFC write confirmation.

- **Expiration**: Pending tags expire after 5 minutes
- **Cleanup**: Automatically cleaned up when expired

### Functions

1. **`prepare_tag_write(p_user_id UUID)`**
   - Generates a new tag ID
   - Stores it as pending (not yet active)
   - Returns: `{ tag_id, pending_id, expires_at }`

2. **`confirm_tag_write(p_user_id UUID, p_pending_id UUID)`**
   - Confirms a successful NFC write
   - Updates user's active tag
   - Records in write history

3. **`cleanup_expired_pending_tags()`**
   - Removes expired pending tags
   - Can be scheduled to run periodically

## New API Endpoints

### POST `/api/user/tag/prepare`
Prepares a new tag for writing (Phase 1).

**Response:**
```json
{
  "success": true,
  "tag_id": "uuid-here",
  "pending_id": "uuid-here", 
  "expires_at": "2025-11-19T12:05:00Z"
}
```

### POST `/api/user/tag/confirm`
Confirms successful NFC write (Phase 2).

**Request:**
```json
{
  "pending_id": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "tag_id": "uuid-here",
  "write_record_id": "uuid-here",
  "written_at": "2025-11-19T12:00:00Z"
}
```

## Migration Steps

1. **Run the SQL migration:**
   ```bash
   # Execute the migration file in your Supabase SQL editor
   documents/migrations/tag_confirmation_migration.sql
   ```

2. **Verify the changes:**
   - New table `user_tag_pending` exists
   - New functions are created
   - No errors in migration

3. **Test the flow:**
   - Navigate to user profile
   - Click "Program New Tag"
   - Verify the prepare/confirm flow works
   - Try canceling during NFC write to ensure no database update

## User Experience

### Success Flow
1. User clicks "Program New Tag"
2. UI shows "Tap NFC Tag Now..."
3. User taps their NFC tag
4. Tag is written successfully
5. Database is updated
6. UI shows success

### Failure Flow
1. User clicks "Program New Tag"
2. UI shows "Tap NFC Tag Now..."
3. User cancels or NFC write fails
4. Error message shown
5. **Database remains unchanged** (no bad tag ID saved)
6. Pending tag expires after 5 minutes

## Benefits

✅ **No Database Corruption**: Failed NFC writes don't leave incorrect data  
✅ **User Safety**: Users can safely retry without worrying about cooldown  
✅ **Clear Error Messages**: Users know exactly what went wrong  
✅ **Automatic Cleanup**: Expired pending tags are tracked for cleanup  

## Backward Compatibility

The old `/api/user/tag/generate` endpoint is marked as deprecated but still works for backward compatibility. The UI now uses the new prepare/confirm flow.

## Future Enhancements

1. **Scheduled Cleanup Job**: Add a cron job to run `cleanup_expired_pending_tags()` every hour
2. **Retry Logic**: Add automatic retry for transient NFC failures
3. **Progress Indicator**: Show user how long they have to complete the write (5 min countdown)
4. **Analytics**: Track success/failure rates of tag writes

## Testing Checklist

- [ ] User can generate new tag successfully
- [ ] Failed NFC write doesn't update database
- [ ] Pending tags expire after 5 minutes
- [ ] Cannot confirm an expired pending tag
- [ ] Cannot confirm the same pending tag twice
- [ ] Cooldown is still enforced (14 days)
- [ ] Tag write history is correctly recorded
- [ ] Error messages are clear and helpful
