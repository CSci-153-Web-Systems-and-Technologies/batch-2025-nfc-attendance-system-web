# Tag Management Documentation

## Overview

The Tag Management System provides a unified identifier (tag_id) for each user that can be used with both NFC tags and QR codes. It includes a cooldown mechanism to prevent abuse, a two-phase commit system to prevent database/NFC desynchronization, and maintains a complete history of tag writes.

**Status:** ✅ Active  
**Last Updated:** November 19, 2025  
**Version:** 2.0.0

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Two-Phase Commit System](#two-phase-commit-system)
3. [Cooldown Mechanism](#cooldown-mechanism)
4. [API Endpoints](#api-endpoints)
5. [Service Methods](#service-methods)
6. [Database Functions](#database-functions)
7. [NFC Implementation](#nfc-implementation)
8. [QR Code Implementation](#qr-code-implementation)
9. [Usage Examples](#usage-examples)

---

## Database Schema

### Modified Table: `users`

Added unified tag identifier column.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `tag_id` | TEXT | YES | NULL | Unified identifier for NFC/QR |

**Constraints:**
- UNIQUE constraint on `tag_id`
- Indexed for fast lookups

**Note:** The columns `nfc_tag_id` and `qr_code_data` are deprecated but kept for backward compatibility. New implementations should use `tag_id` exclusively.

---

### Table: `user_tag_writes`

Tracks history of tag generations to enforce cooldown period.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `user_id` | UUID | NO | - | FK to users.id |
| `tag_id` | TEXT | NO | - | The tag value that was written |
| `written_at` | TIMESTAMP WITH TIME ZONE | NO | NOW() | When tag was generated |
| `created_at` | TIMESTAMP WITH TIME ZONE | NO | NOW() | Record creation time |

**Constraints:**
- `tag_id_not_empty`: CHECK length(tag_id) > 0

**Indexes:**
- `idx_tag_writes_user_id` ON (user_id)
- `idx_tag_writes_written_at` ON (written_at DESC)
- `idx_tag_writes_user_written` ON (user_id, written_at DESC)

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE CASCADE

---

### Table: `user_tag_pending`

Stores temporary tag IDs awaiting NFC write confirmation (two-phase commit).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `user_id` | UUID | NO | - | FK to users.id |
| `tag_id` | TEXT | NO | - | The pending tag ID |
| `created_at` | TIMESTAMP WITH TIME ZONE | NO | NOW() | When prepared |
| `expires_at` | TIMESTAMP WITH TIME ZONE | NO | NOW() + 5 min | Expiration time |
| `confirmed` | BOOLEAN | NO | FALSE | Whether confirmed |
| `confirmed_at` | TIMESTAMP WITH TIME ZONE | YES | NULL | When confirmed |

**Constraints:**
- `tag_id_not_empty`: CHECK length(tag_id) > 0

**Indexes:**
- `idx_tag_pending_user_id` ON (user_id)
- `idx_tag_pending_expires` ON (expires_at)
- `idx_tag_pending_confirmed` ON (confirmed, user_id)

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE CASCADE

**Purpose:**
Prevents database/NFC desynchronization by storing tag IDs in a pending state until NFC write is confirmed successful.

---

## Two-Phase Commit System

### Overview

The two-phase commit system ensures that the database is only updated after a successful NFC write, preventing desynchronization between the physical tag and the database.

**Problem Solved:**
- ❌ **Before:** Generate UUID → Save to DB → Write to NFC fails → Database corrupted
- ✅ **After:** Prepare UUID → Write to NFC → Confirm to DB (only if NFC succeeds)

### How It Works

**Phase 1: Prepare**
1. User clicks "Program New Tag"
2. System checks cooldown eligibility
3. System generates a new UUID
4. UUID is stored in `user_tag_pending` table (NOT in `users.tag_id`)
5. System returns UUID and pending_id to client
6. Pending record expires after 5 minutes if not confirmed

**Phase 2: Confirm**
1. Client writes UUID to NFC tag
2. If NFC write succeeds, client calls confirm endpoint
3. System validates pending_id and checks expiration
4. System updates `users.tag_id` with the UUID
5. System records write in `user_tag_writes` history
6. System marks pending record as confirmed

**Failure Handling:**
- If NFC write fails, client does NOT call confirm
- Pending record expires after 5 minutes
- Database remains unchanged (safe to retry)
- User can try again without losing cooldown eligibility

### Benefits

✅ **No Database Corruption**: Failed NFC writes don't leave incorrect data  
✅ **Safe Retry**: Users can retry without penalty  
✅ **Atomic Operations**: Tag is either fully written or not at all  
✅ **Clear Error Messages**: Users know exactly what went wrong  
✅ **Audit Trail**: All attempts are trackable  

---

## Cooldown Mechanism

### Configuration

The tag write cooldown is configured in two places:

1. **Backend SQL Function:** `can_user_write_tag()`
   ```sql
   v_cooldown_days INTEGER := 14; -- Modify this value
   ```

2. **Frontend Constant:** `src/lib/constants.ts`
   ```typescript
   export const TAG_WRITE_COOLDOWN_DAYS = 14;
   ```

**IMPORTANT:** Keep both values synchronized!

### How It Works

1. User requests a new tag generation
2. System checks `user_tag_writes` table for last write
3. If no previous writes exist, generation is allowed
4. If previous write exists, calculate: `last_write_date + cooldown_days`
5. If current time >= next available date, generation is allowed
6. Otherwise, return next available date to user

### Cooldown Calculation

```typescript
next_available_date = last_write_date + 14 days
can_write = current_time >= next_available_date
```

**Example:**
- Last write: November 1, 2025
- Cooldown: 14 days
- Next available: November 15, 2025
- Today: November 10, 2025
- Can write: FALSE (5 days remaining)

---

## API Endpoints

### GET `/api/user/tag/can-write`

Check if the current user can write a new tag.

**Authentication:** Required

**Response:**
```typescript
{
  can_write: boolean;
  next_available_date: string | null;
  last_write_date: string | null;
  cooldown_days: number;
  days_remaining?: number; // Only if can_write is false
}
```

**Example Response (Cannot Write):**
```json
{
  "can_write": false,
  "next_available_date": "2025-11-15T10:30:00Z",
  "last_write_date": "2025-11-01T10:30:00Z",
  "cooldown_days": 14,
  "days_remaining": 5
}
```

---

### POST `/api/user/tag/prepare`

Prepare a new tag for the current user (Phase 1 of two-phase commit).

**Authentication:** Required

**Request Body:** None (uses authenticated user)

**Response:**
```typescript
{
  success: boolean;
  tag_id: string;       // The UUID to write to NFC
  pending_id: string;   // ID for confirmation
  expires_at: string;   // When this preparation expires
}
```

**Errors:**
- `400` - Cooldown period not elapsed
- `401` - Unauthorized
- `500` - Server error

**Example Response:**
```json
{
  "success": true,
  "tag_id": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5g6h7",
  "pending_id": "x9y8z7w6-v5u4-3210-t9s8-r7q6p5o4n3m2",
  "expires_at": "2025-11-19T14:35:00Z"
}
```

**Usage:**
Call this endpoint to get a tag ID before attempting NFC write. If NFC write succeeds, call `/api/user/tag/confirm` with the pending_id.

---

### POST `/api/user/tag/confirm`

Confirm a pending tag write (Phase 2 of two-phase commit).

**Authentication:** Required

**Request Body:**
```typescript
{
  pending_id: string;  // From prepare response
}
```

**Response:**
```typescript
{
  success: boolean;
  tag_id: string;
  write_record_id: string;
  written_at: string;
}
```

**Errors:**
- `400` - Missing pending_id
- `401` - Unauthorized
- `404` - Pending tag not found
- `409` - Tag already confirmed
- `410` - Pending tag expired
- `500` - Server error

**Example Response:**
```json
{
  "success": true,
  "tag_id": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5g6h7",
  "write_record_id": "p1o2n3m4-l5k6-7890-j9i8-h7g6f5e4d3c2",
  "written_at": "2025-11-19T14:32:00Z"
}
```

**Usage:**
Only call this after successfully writing the tag_id to the NFC tag. If NFC write fails, do nothing - the pending tag will expire.

---

### POST `/api/user/tag/generate` (DEPRECATED)

**⚠️ DEPRECATED:** Use `/api/user/tag/prepare` + `/api/user/tag/confirm` instead.

Generate a new tag for the current user (old single-phase method).

**Authentication:** Required

**Request Body:** None (uses authenticated user)

**Response:**
```typescript
{
  success: boolean;
  tag_id: string;
  write_record_id: string;
  written_at: string;
}
```

**Note:** This endpoint immediately commits the tag to the database before NFC write, which can cause desynchronization if NFC write fails. Use the new two-phase commit flow instead.

---

### GET `/api/user/tag/history`

Get tag write history for the current user.

**Authentication:** Required

**Query Parameters:**
- `limit`: number (default: 10) - Max records to return

**Response:**
```typescript
{
  writes: TagWriteRecord[];
  total_writes: number;
}
```

---

### GET `/api/user/by-tag?tag_id={tag_id}`

Lookup a user by their tag ID (for NFC/QR scanning).

**Authentication:** Required

**Query Parameters:**
- `tag_id`: string (required) - The tag identifier

**Response:**
```typescript
{
  id: string;
  name: string;
  email: string;
  user_type: string;
  tag_id: string;
}
```

**Errors:**
- `400` - Missing tag_id parameter
- `404` - User not found with that tag
- `401` - Unauthorized

---

## Service Methods

### UserService (Extended)

Location: `src/lib/services/user.service.ts`

#### `canWriteTag(userId: string): Promise<CanWriteTagResponse>`

Check if a user can write a new tag.

**Parameters:**
- `userId`: UUID of the user

**Returns:** CanWriteTagResponse with cooldown info

---

#### `prepareTag(userId: string): Promise<PrepareTagResponse>`

Prepare a new tag for a user (Phase 1 of two-phase commit).

**Parameters:**
- `userId`: UUID of the user

**Returns:** PrepareTagResponse with tag_id, pending_id, and expires_at

**Throws:**
- Error if cooldown period not elapsed
- Error if user not found

**Usage:**
Call this before attempting NFC write. Store the pending_id for confirmation.

---

#### `confirmTag(userId: string, pendingId: string): Promise<GenerateTagResponse>`

Confirm a pending tag write (Phase 2 of two-phase commit).

**Parameters:**
- `userId`: UUID of the user
- `pendingId`: The pending_id from prepareTag response

**Returns:** GenerateTagResponse with confirmed tag_id and write_record_id

**Throws:**
- Error if pending tag expired
- Error if pending_id not found
- Error if already confirmed

**Usage:**
Only call this after successfully writing the tag to NFC.

---

#### `generateTag(userId: string): Promise<GenerateTagResponse>` (DEPRECATED)

**⚠️ DEPRECATED:** Use `prepareTag` + `confirmTag` instead.

Generate a new tag for a user (old single-phase method).

**Parameters:**
- `userId`: UUID of the user

**Returns:** GenerateTagResponse with new tag_id

**Throws:**
- Error if cooldown period not elapsed
- Error if user not found

---

#### `getTagWriteHistory(userId: string, limit?: number): Promise<TagWriteRecord[]>`

Get tag write history for a user.

**Parameters:**
- `userId`: UUID of the user
- `limit`: Optional max records (default: 10)

**Returns:** Array of TagWriteRecord

---

#### `getUserByTag(tagId: string): Promise<User | null>`

Lookup a user by their tag ID.

**Parameters:**
- `tagId`: The tag identifier

**Returns:** User object or null if not found

---

## Database Functions

### `can_user_write_tag(p_user_id UUID)`

Check if a user is allowed to write a new tag.

**Returns:** JSON
```json
{
  "can_write": boolean,
  "next_available_date": timestamp | null,
  "last_write_date": timestamp | null,
  "cooldown_days": integer
}
```

**Logic:**
1. Query most recent write from `user_tag_writes`
2. If no previous write, return `can_write: true`
3. Calculate next available date: `last_write + cooldown_days`
4. Compare with current time
5. Return result with all relevant dates

---

### `prepare_tag_write(p_user_id UUID)`

Prepare a new tag ID for writing (Phase 1 of two-phase commit).

**Returns:** JSON
```json
{
  "success": boolean,
  "tag_id": string,
  "pending_id": uuid,
  "expires_at": timestamp
}
```

**Process:**
1. Call `can_user_write_tag()` to check eligibility
2. If cannot write, raise exception with next available date
3. Delete any existing unconfirmed pending tags for user
4. Generate new UUID for tag
5. Insert into `user_tag_pending` (NOT `users` table)
6. Set expiration to NOW() + 5 minutes
7. Return success response with pending_id

**Errors:**
- Raises exception if cooldown not elapsed

**Note:**
Does NOT update `users.tag_id` or `user_tag_writes`. Tag is in pending state.

---

### `confirm_tag_write(p_user_id UUID, p_pending_id UUID)`

Confirm a pending tag write (Phase 2 of two-phase commit).

**Returns:** JSON
```json
{
  "success": boolean,
  "tag_id": string,
  "write_record_id": uuid,
  "written_at": timestamp
}
```

**Process:**
1. Fetch pending record by `p_pending_id` and `p_user_id`
2. Verify record exists
3. Check if expired (`expires_at < NOW()`)
4. Check if already confirmed
5. Update `users.tag_id` with the tag from pending
6. Insert record into `user_tag_writes`
7. Mark pending record as confirmed
8. Return success response

**Errors:**
- Raises exception if pending tag not found
- Raises exception if expired
- Raises exception if already confirmed

**Note:**
Only call this after successfully writing tag to NFC.

---

### `cleanup_expired_pending_tags()`

Remove expired unconfirmed pending tags.

**Returns:** INTEGER (count of deleted records)

**Process:**
1. Delete from `user_tag_pending` where `expires_at < NOW()` AND `confirmed = FALSE`
2. Return count of deleted records

**Usage:**
Can be run periodically (e.g., hourly cron job) to clean up stale pending records.

---

### `generate_and_assign_tag(p_user_id UUID)` (DEPRECATED)

**⚠️ DEPRECATED:** Use `prepare_tag_write` + `confirm_tag_write` instead.

Generate a new tag ID, assign to user, and record the write (old single-phase method).

**Returns:** JSON
```json
{
  "success": boolean,
  "tag_id": string,
  "write_record_id": uuid,
  "written_at": timestamp
}
```

**Process:**
1. Call `can_user_write_tag()` to check eligibility
2. If cannot write, raise exception with next available date
3. Generate new UUID for tag
4. Update `users.tag_id` column
5. Insert record into `user_tag_writes`
6. Return success response

**Errors:**
- Raises exception if cooldown not elapsed

**Note:**
This function immediately commits to database before NFC write, which can cause desynchronization.

---

### `confirm_tag_update(p_user_id UUID, p_tag_id TEXT)`

Updates tag ID and records write history if cooldown period has elapsed.

**Parameters:**
- `p_user_id`: UUID of the user
- `p_tag_id`: The new tag ID to assign

**Returns:** JSON
```json
{
  "success": boolean,
  "tag_id": string,
  "write_record_id": uuid,
  "written_at": timestamp
}
```

**Process:**
1. Call `can_user_write_tag()` to check eligibility
2. If cannot write, raise exception with next available date
3. Update `users.tag_id` with provided `p_tag_id`
4. Insert record into `user_tag_writes`
5. Return success response

**Errors:**
- Raises exception if cooldown not elapsed

---

### `get_tag_write_history(p_user_id UUID, p_limit INTEGER)`

Get tag write history for a user.

**Parameters:**
- `p_user_id`: UUID of user
- `p_limit`: Max records to return (default: 10)

**Returns:** JSON array of write records

---

## RLS Policies

### `users_can_view_own_tag_writes`

**Table:** user_tag_writes  
**Operation:** SELECT  
**Rule:** Users can view their own tag write history

```sql
USING (user_id = auth.uid())
```

---

### `users_can_insert_own_tag_writes`

**Table:** user_tag_writes  
**Operation:** INSERT  
**Rule:** Users can record their own tag writes (via function)

```sql
WITH CHECK (user_id = auth.uid())
```

**Note:** No UPDATE or DELETE policies - tag write history is immutable.

---

## NFC Implementation

### Browser Support

**Supported:**
- ✅ Chrome for Android 89+
- ✅ Edge for Android 89+
- ✅ Samsung Internet 15+

**Not Supported:**
- ❌ iOS Safari (no Web NFC API)
- ❌ Desktop browsers (security restrictions)
- ❌ Firefox (no Web NFC API)

### Writing to NFC Tag

```typescript
import { NFCWriter } from '@/lib/nfc';

async function writeTagToNFC(tagId: string) {
  if (!('NDEFReader' in window)) {
    throw new Error('NFC not supported on this device');
  }

  const ndef = new NDEFReader();
  
  try {
    await ndef.write({
      records: [
        {
          recordType: 'text',
          data: tagId
        }
      ]
    });
    
    console.log('Tag written successfully');
  } catch (error) {
    console.error('Write failed:', error);
    throw error;
  }
}
```

### Reading from NFC Tag

```typescript
import { NFCReader } from '@/lib/nfc';

async function scanNFCTag() {
  if (!('NDEFReader' in window)) {
    throw new Error('NFC not supported on this device');
  }

  const ndef = new NDEFReader();
  
  try {
    await ndef.scan();
    
    ndef.onreading = (event) => {
      const { message } = event;
      const record = message.records[0];
      const textDecoder = new TextDecoder();
      const tagId = textDecoder.decode(record.data);
      
      console.log('Tag scanned:', tagId);
      return tagId;
    };
  } catch (error) {
    console.error('Scan failed:', error);
    throw error;
  }
}
```

### NFC Tag Recommendations

**Recommended Tags:**
- **NTAG213** - 144 bytes user memory (sufficient for UUID)
- **NTAG215** - 504 bytes user memory (more storage)
- **NTAG216** - 888 bytes user memory (maximum)

**Tag Format:**
- Type: NDEF (NFC Data Exchange Format)
- Record: Text record
- Encoding: UTF-8
- Content: Tag ID (UUID format)

---

## QR Code Implementation

### Generation

```typescript
import QRCode from 'qrcode';
import { QR_CODE_SIZE, QR_CODE_ERROR_CORRECTION } from '@/lib/constants';

async function generateQRCode(tagId: string): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(tagId, {
    width: QR_CODE_SIZE,
    errorCorrectionLevel: QR_CODE_ERROR_CORRECTION,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  
  return qrDataUrl;
}
```

### Scanning

```typescript
import { Html5Qrcode } from 'html5-qrcode';

async function scanQRCode(): Promise<string> {
  const html5QrCode = new Html5Qrcode('qr-reader');
  
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 }
  };
  
  return new Promise((resolve, reject) => {
    html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        html5QrCode.stop();
        resolve(decodedText);
      },
      (error) => {
        console.warn('QR scan error:', error);
      }
    ).catch(reject);
  });
}
```

### Download QR Code as PNG

```typescript
async function downloadQRCode(tagId: string, filename: string = 'my-qr-code.png') {
  const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
  
  canvas.toBlob((blob) => {
    if (!blob) return;
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
  }, 'image/png');
}
```

---

## Usage Examples

### Check If User Can Generate Tag

```typescript
import { UserService } from '@/lib/services/user.service';

const result = await UserService.canWriteTag(userId);

if (result.can_write) {
  console.log('User can generate a new tag now');
} else {
  const daysRemaining = Math.ceil(
    (new Date(result.next_available_date!) - new Date()) / (1000 * 60 * 60 * 24)
  );
  console.log(`Please wait ${daysRemaining} more days`);
}
```

---

### Generate New Tag (Two-Phase Commit - Recommended)

```typescript
import { UserService } from '@/lib/services/user.service';

async function generateAndWriteTag(userId: string) {
  let pendingId: string | null = null;
  let tagId: string | null = null;

  try {
    // PHASE 1: Prepare the tag
    const prepareResult = await UserService.prepareTag(userId);
    tagId = prepareResult.tag_id;
    pendingId = prepareResult.pending_id;
    
    console.log('Tag prepared:', tagId);
    console.log('Expires at:', prepareResult.expires_at);
    
    // PHASE 2: Write to NFC
    const nfcSuccess = await writeToNFC(tagId);
    
    if (!nfcSuccess) {
      throw new Error('NFC write failed');
    }
    
    // PHASE 3: Confirm the write
    const confirmResult = await UserService.confirmTag(userId, pendingId);
    console.log('Tag confirmed and activated:', confirmResult.tag_id);
    
    return confirmResult;
    
  } catch (error) {
    console.error('Tag generation failed:', error.message);
    // If NFC write failed, pending tag will expire - safe to retry
    // Database remains unchanged
    throw error;
  }
}

async function writeToNFC(tagId: string): Promise<boolean> {
  if (!('NDEFReader' in window)) {
    throw new Error('NFC not supported');
  }
  
  try {
    const ndef = new NDEFReader();
    await ndef.write({
      records: [{ recordType: 'text', data: tagId }]
    });
    return true;
  } catch (error) {
    console.error('NFC write error:', error);
    return false;
  }
}
```

---

### Generate New Tag (Legacy Single-Phase - Not Recommended)

```typescript
import { UserService } from '@/lib/services/user.service';

// ⚠️ WARNING: This method can cause database/NFC desynchronization
// Use two-phase commit instead

try {
  const result = await UserService.generateTag(userId);
  console.log('New tag generated:', result.tag_id);
  
  // Now try to write to NFC
  // ❌ If this fails, database already has the new tag!
  await writeToNFC(result.tag_id);
  
} catch (error) {
  console.error('Tag generation failed:', error.message);
}
```

---

### Display QR Code on Profile

```typescript
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

function UserTagDisplay({ tagId }: { tagId: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  useEffect(() => {
    if (tagId) {
      QRCode.toDataURL(tagId, {
        width: 300,
        errorCorrectionLevel: 'M'
      }).then(setQrDataUrl);
    }
  }, [tagId]);
  
  if (!qrDataUrl) return <div>Loading QR code...</div>;
  
  return (
    <div>
      <img src={qrDataUrl} alt="Your QR Code" />
      <button onClick={() => downloadQRCode(tagId)}>
        Download PNG
      </button>
    </div>
  );
}
```

---

### Write Tag to NFC

```typescript
async function handleWriteToNFC(tagId: string) {
  if (!('NDEFReader' in window)) {
    alert('NFC is only supported on Android Chrome');
    return;
  }
  
  try {
    const ndef = new NDEFReader();
    await ndef.write({ records: [{ recordType: 'text', data: tagId }] });
    alert('Tag written successfully! Tap your NFC tag now.');
  } catch (error) {
    alert('Failed to write tag: ' + error.message);
  }
}
```

---

## Security Considerations

1. **Two-Phase Commit:** Prevents database/NFC desynchronization on write failures
2. **Pending Expiration:** Unconfirmed tags expire after 5 minutes
3. **Cooldown Enforcement:** Prevents users from generating unlimited tags - strictly enforced for ALL writes
4. **Immutable History:** Tag writes cannot be deleted (audit trail)
5. **Unique Tags:** Each tag_id is globally unique (UUID v4)
6. **RLS Policies:** Users can only access their own tag data
7. **No Tag Reuse:** Once confirmed, a tag_id is permanent until next rotation
8. **Atomic Operations:** Tags are either fully written or not at all
9. **No Bypass:** Users cannot write any tag (new or existing) during cooldown period

### Two-Phase Commit Security

**Prevents Race Conditions:**
- User cannot confirm a tag they didn't prepare
- Pending tags are tied to specific user_id
- Expired tags cannot be confirmed
- Already-confirmed tags cannot be re-confirmed

**Attack Prevention:**
- Cannot bypass cooldown by preparing multiple tags
- Cannot confirm someone else's pending tag
- Cannot reuse expired pending_id
- All operations logged for audit
- **No ability to write existing tag ID** - every write must generate new ID and respect cooldown

---

## Modifying Cooldown Period

### For Developers

**Step 1:** Update SQL function
```sql
-- In database migration or SQL editor
CREATE OR REPLACE FUNCTION can_user_write_tag(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_cooldown_days INTEGER := 7; -- CHANGE THIS VALUE
    ...
```

**Step 2:** Update frontend constant
```typescript
// src/lib/constants.ts
export const TAG_WRITE_COOLDOWN_DAYS = 7; // CHANGE THIS VALUE
```

**Step 3:** Update documentation
- Update this file
- Update ATTENDANCE_DOCUMENTATION.md
- Update any user-facing help text

### Recommended Values

- **7 days:** More flexible, higher risk of abuse
- **14 days:** Balanced (current default)
- **30 days:** Very strict, minimal abuse risk
- **90 days:** Extremely strict, almost immutable

---

## Tag Format

### UUID v4 Format

Tags are generated as standard UUIDv4:

```
a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5g6h7
```

**Properties:**
- Length: 36 characters (with hyphens)
- Format: 8-4-4-4-12 hexadecimal
- Uniqueness: 2^122 possible values
- Collision probability: Negligible

### Validation Regex

```typescript
const TAG_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

---

## Troubleshooting

### User Cannot Generate Tag

**Problem:** `can_write` returns false

**Solutions:**
1. Check `last_write_date` in response
2. Calculate days remaining: `(next_available_date - now) / 86400000`
3. Display countdown to user
4. If admin override needed, manually update database (not recommended)

---

### NFC Write Fails After Prepare

**Problem:** `prepare_tag_write()` succeeds but NFC write fails

**Solutions:**
1. Do NOT call confirm - let pending tag expire
2. Display error to user: "NFC write failed. Please try again."
3. User can retry immediately (new prepare will delete old pending)
4. Database remains unchanged - safe to retry
5. Old pending tag will auto-expire after 5 minutes

**What NOT to do:**
- ❌ Don't call confirm endpoint if NFC failed
- ❌ Don't try to manually update database
- ❌ Don't tell user their cooldown is affected

---

### Pending Tag Expired

**Problem:** User took too long to tap NFC tag

**Error:** "Pending tag has expired. Please generate a new one."

**Solutions:**
1. User clicks "Program New Tag" again
2. New prepare will succeed (old one expired)
3. User must complete NFC write within 5 minutes
4. If user is slow, consider increasing expiration time in migration

---

### Database/NFC Desync (Should Not Happen)

**Problem:** User's database tag_id doesn't match their NFC tag

**Symptoms:**
- Scanner cannot find user by tag
- User says "I can't check in"
- Tag lookup returns wrong user or no user

**Solutions with Two-Phase Commit:**
1. This should not happen with new system
2. If it does, user can use "Write Existing ID to Tag"
3. Or wait for cooldown and generate new tag
4. Check `user_tag_pending` for stuck pending records

**Prevention:**
- Always use prepare/confirm flow
- Never call confirm if NFC write failed
- Educate users to complete within 5 minutes

---

### NFC Write Fails

**Problem:** `NDEFReader.write()` throws error

**Solutions:**
1. Verify browser support (`'NDEFReader' in window`)
2. Check Android Chrome version (89+)
3. Ensure HTTPS connection (required for NFC API)
4. Check NFC permissions in browser
5. Verify NFC tag is blank or compatible

---

### QR Code Not Scanning

**Problem:** QR scanner cannot read code

**Solutions:**
1. Increase QR code size (300px minimum)
2. Improve error correction level ('M' or 'H')
3. Ensure good lighting
4. Check camera permissions
5. Verify QR code contains valid tag_id

---

## Future Enhancements

- [ ] Scheduled cleanup job for expired pending tags (hourly cron)
- [ ] Tag expiration dates (auto-rotate after N days)
- [ ] Tag revocation system (emergency invalidation)
- [ ] Multiple tags per user (backup tags)
- [ ] Tag transfer between users (ownership change)
- [ ] Tag analytics (scan counts, locations, success rates)
- [ ] Custom tag formats (non-UUID options)
- [ ] Batch tag generation for admins
- [ ] Tag templates with embedded organization data
- [ ] Retry mechanism with exponential backoff for NFC failures
- [ ] Real-time sync status indicator (pending vs confirmed)
- [ ] Push notifications for successful confirmations

---

## Changelog

### Version 2.0.0 (November 19, 2025)

**Added:**
- Two-phase commit system (prepare/confirm flow)
- `user_tag_pending` table for temporary tag storage
- `prepare_tag_write()` database function
- `confirm_tag_write()` database function
- `cleanup_expired_pending_tags()` database function
- `/api/user/tag/prepare` endpoint
- `/api/user/tag/confirm` endpoint
- `prepareTag()` and `confirmTag()` service methods
- 5-minute expiration for pending tags
- Comprehensive error handling for write failures

**Changed:**
- Tag generation now uses two-phase commit by default
- Updated UI to use prepare/confirm flow
- Improved error messages for better UX

**Deprecated:**
- `/api/user/tag/generate` endpoint (use prepare/confirm instead)
- `generateTag()` service method (use prepareTag/confirmTag instead)
- `generate_and_assign_tag()` database function (use prepare/confirm instead)

**Security:**
- Eliminated database/NFC desynchronization risk
- Added atomic tag write operations
- Improved audit trail with pending state tracking

### Version 1.0.0 (Previous)

- Initial tag management system
- Unified tag_id for NFC and QR codes
- 14-day cooldown mechanism
- Tag write history tracking
- Basic NFC writing support

---

## Related Documentation

- [Attendance Documentation](./ATTENDANCE_DOCUMENTATION.md)
- [User Documentation](./USER_DOCUMENTATION.md)
- [Database Structure](./CURRENT_DATABASE_STRUCTURE.sql)

---

**Last Updated:** November 19, 2025  
**Maintained By:** Development Team
