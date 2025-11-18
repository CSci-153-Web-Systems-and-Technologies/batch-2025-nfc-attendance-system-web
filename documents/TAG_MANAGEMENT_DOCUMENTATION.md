# Tag Management Documentation

## Overview

The Tag Management System provides a unified identifier (tag_id) for each user that can be used with both NFC tags and QR codes. It includes a cooldown mechanism to prevent abuse and maintains a complete history of tag writes.

**Status:** ✅ Active  
**Last Updated:** November 19, 2025  
**Version:** 1.0.0

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Cooldown Mechanism](#cooldown-mechanism)
3. [API Endpoints](#api-endpoints)
4. [Service Methods](#service-methods)
5. [Database Functions](#database-functions)
6. [NFC Implementation](#nfc-implementation)
7. [QR Code Implementation](#qr-code-implementation)
8. [Usage Examples](#usage-examples)

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

### POST `/api/user/tag/generate`

Generate a new tag for the current user.

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

**Errors:**
- `400` - Cooldown period not elapsed
- `401` - Unauthorized
- `500` - Server error

**Example Response:**
```json
{
  "success": true,
  "tag_id": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5g6h7",
  "write_record_id": "x9y8z7w6-v5u4-3210-t9s8-r7q6p5o4n3m2",
  "written_at": "2025-11-19T14:30:00Z"
}
```

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

#### `generateTag(userId: string): Promise<GenerateTagResponse>`

Generate a new tag for a user.

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

### `generate_and_assign_tag(p_user_id UUID)`

Generate a new tag ID, assign to user, and record the write.

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

### Generate New Tag

```typescript
import { UserService } from '@/lib/services/user.service';

try {
  const result = await UserService.generateTag(userId);
  console.log('New tag generated:', result.tag_id);
  
  // Update UI to show new QR code and enable NFC writing
} catch (error) {
  console.error('Tag generation failed:', error.message);
  // Show cooldown message to user
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

1. **Cooldown Enforcement:** Prevents users from generating unlimited tags
2. **Immutable History:** Tag writes cannot be deleted (audit trail)
3. **Unique Tags:** Each tag_id is globally unique (UUID)
4. **RLS Policies:** Users can only access their own tag data
5. **No Tag Reuse:** Once generated, a tag_id is permanent until regenerated

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

- [ ] Tag expiration dates
- [ ] Tag revocation system
- [ ] Multiple tags per user
- [ ] Tag transfer between users
- [ ] Tag analytics (scan counts, locations)
- [ ] Custom tag formats (non-UUID)
- [ ] Batch tag generation for admins
- [ ] Tag templates with embedded organization data

---

## Related Documentation

- [Attendance Documentation](./ATTENDANCE_DOCUMENTATION.md)
- [User Documentation](./USER_DOCUMENTATION.md)
- [Database Structure](./CURRENT_DATABASE_STRUCTURE.sql)

---

**Last Updated:** November 19, 2025  
**Maintained By:** Development Team
