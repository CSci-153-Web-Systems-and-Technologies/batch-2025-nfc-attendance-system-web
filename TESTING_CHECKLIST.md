# Tag Confirmation System - Testing Checklist

## Pre-Testing Verification

### 1. Database Migration Applied
- [x] `tag_confirmation_migration.sql` executed in Supabase
- [ ] `user_tag_pending` table exists
- [ ] `prepare_tag_write()` function exists
- [ ] `confirm_tag_write()` function exists
- [ ] `cleanup_expired_pending_tags()` function exists

**How to verify:**
```sql
-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'user_tag_pending';

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('prepare_tag_write', 'confirm_tag_write', 'cleanup_expired_pending_tags');
```

---

## Test Scenarios

### Test 1: Successful Tag Generation (Happy Path)

**Steps:**
1. Navigate to user profile page
2. Verify you can see "Program New Tag" button
3. Click "Program New Tag"
4. UI should show "Tap NFC Tag Now..."
5. Tap your NFC tag to Android phone
6. Wait for success message
7. Verify new tag ID appears in profile
8. Verify tag write history shows new entry

**Expected Results:**
- ✅ Tag ID is written to NFC card
- ✅ Database `users.tag_id` is updated
- ✅ Entry added to `user_tag_writes`
- ✅ Entry in `user_tag_pending` marked as `confirmed = true`
- ✅ No errors shown to user

**Database Verification:**
```sql
-- Check user's current tag
SELECT id, name, tag_id FROM users WHERE id = 'your-user-id';

-- Check latest write record
SELECT * FROM user_tag_writes 
WHERE user_id = 'your-user-id' 
ORDER BY written_at DESC LIMIT 1;

-- Check pending record was confirmed
SELECT * FROM user_tag_pending 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC LIMIT 1;
```

---

### Test 2: NFC Write Failure (Critical Test)

**Steps:**
1. Navigate to user profile page
2. Click "Program New Tag"
3. UI shows "Tap NFC Tag Now..."
4. **DO NOT tap NFC tag - click Cancel or close browser**

**Expected Results:**
- ✅ Error message shown: "Failed to write tag to NFC"
- ✅ Database `users.tag_id` is **UNCHANGED**
- ✅ Entry in `user_tag_pending` remains `confirmed = false`
- ✅ User can retry immediately without penalty
- ✅ Old tag ID still works for attendance

**Database Verification:**
```sql
-- User's tag_id should be unchanged
SELECT tag_id FROM users WHERE id = 'your-user-id';

-- Check pending record exists and is NOT confirmed
SELECT tag_id, confirmed, expires_at FROM user_tag_pending 
WHERE user_id = 'your-user-id' AND confirmed = false;

-- Try using old tag for attendance (should still work)
SELECT * FROM users WHERE tag_id = 'your-old-tag-id';
```

---

### Test 3: Cooldown Enforcement

**Steps:**
1. Successfully generate a new tag (Test 1)
2. Immediately try to generate another tag
3. Click "Program New Tag" button

**Expected Results:**
- ✅ Button shows "New Tag Available in 14 Days"
- ✅ Button is disabled
- ✅ Cannot click to start generation
- ✅ Error if somehow bypassed: "Cooldown period not elapsed"

**Database Verification:**
```sql
-- Check cooldown status
SELECT can_user_write_tag('your-user-id');
-- Should return: {"can_write": false, "next_available_date": "..."}
```

---

### Test 4: Pending Tag Expiration

**Steps:**
1. Click "Program New Tag"
2. Note the tag_id and pending_id from network tab (F12 → Network → prepare response)
3. **Wait 6+ minutes** (or manually update `expires_at` in database to past)
4. Try to tap NFC tag with the old tag_id
5. Or manually call confirm endpoint with expired pending_id

**Expected Results:**
- ✅ Confirm fails with error: "Pending tag has expired"
- ✅ Database is not updated
- ✅ User must generate new tag

**Manual Database Test:**
```sql
-- Manually expire a pending tag
UPDATE user_tag_pending 
SET expires_at = NOW() - INTERVAL '1 minute' 
WHERE user_id = 'your-user-id' AND confirmed = false;

-- Try to confirm it (should fail)
SELECT confirm_tag_write('your-user-id', 'the-pending-id');
-- Should raise: "Pending tag has expired. Please generate a new one."
```

---

### Test 5: Retry After Failure

**Steps:**
1. Click "Program New Tag"
2. Cancel the NFC write (Test 2)
3. Click "Program New Tag" again immediately
4. Complete the NFC write successfully

**Expected Results:**
- ✅ First attempt creates pending record (unconfirmed)
- ✅ Second prepare deletes first pending record
- ✅ Second attempt creates new pending record
- ✅ Second NFC write succeeds and confirms
- ✅ Only one tag_id ends up in database

**Database Verification:**
```sql
-- Should only have ONE confirmed pending record
SELECT COUNT(*) FROM user_tag_pending 
WHERE user_id = 'your-user-id' AND confirmed = true;

-- Should have ONE write record
SELECT COUNT(*) FROM user_tag_writes 
WHERE user_id = 'your-user-id' 
AND written_at > NOW() - INTERVAL '1 hour';
```

---

### Test 6: Lost Card Scenario During Cooldown

**Steps:**
1. User successfully generates and writes a tag
2. User "loses" their NFC card (remove it)
3. User tries to generate a new tag within 14 days
4. Observe the UI

**Expected Results:**
- ✅ Button shows "New Tag Available in X Days" and is disabled
- ✅ User CANNOT write to a replacement card
- ✅ User must wait until cooldown ends
- ✅ No workaround or bypass available

**Note:** This enforces strict security - lost cards during cooldown mean user cannot check in until cooldown ends or they find their original card.

---

### Test 8: Attendance Scanning Still Works

**Steps:**
1. Create a new user account
2. Complete profile setup
3. Navigate to user profile/tag management
4. Observe the UI

**Expected Results:**
- ✅ No tag_id in database (NULL)
- ✅ "No Tag Assigned" warning shown
- ✅ "Program New Tag" button is ENABLED (no cooldown for first-time)
- ✅ User can immediately generate their first tag
- ✅ After successful write, cooldown starts (14 days)

---

**Steps:**
1. Generate a new tag using the new system
2. Go to an event attendance scanner
3. Tap your NFC card to mark attendance

**Expected Results:**
- ✅ Scanner reads tag_id from NFC card
- ✅ System finds user by tag_id
- ✅ Attendance is marked successfully
- ✅ User's name appears in attendance list

---

### Test 9: Multiple Pending Tags Cleanup

**Steps:**
1. Manually insert multiple pending records (for testing)
2. Prepare a new tag

**Expected Results:**
- ✅ Old unconfirmed pending records are deleted
- ✅ Only newest pending record exists

**Database Test:**
```sql
-- Insert fake old pending tags
INSERT INTO user_tag_pending (user_id, tag_id, expires_at, confirmed)
VALUES 
  ('your-user-id', 'fake-tag-1', NOW() + INTERVAL '5 minutes', false),
  ('your-user-id', 'fake-tag-2', NOW() + INTERVAL '5 minutes', false);

-- Now prepare a new tag via UI
-- Then check:
SELECT COUNT(*) FROM user_tag_pending 
WHERE user_id = 'your-user-id' AND confirmed = false;
-- Should be 1 (only the new one)
```

---

## Browser Console Testing

### Test API Endpoints Directly

```javascript
// Test prepare endpoint
const prepareResponse = await fetch('/api/user/tag/prepare', {
  method: 'POST',
  credentials: 'include'
});
const prepareData = await prepareResponse.json();
console.log('Prepare:', prepareData);
// Expected: { success: true, tag_id: "...", pending_id: "...", expires_at: "..." }

// Test confirm endpoint (use pending_id from above)
const confirmResponse = await fetch('/api/user/tag/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ pending_id: prepareData.pending_id })
});
const confirmData = await confirmResponse.json();
console.log('Confirm:', confirmData);
// Expected: { success: true, tag_id: "...", write_record_id: "...", written_at: "..." }
```

---

## Performance Testing

### Test 1: Prepare Endpoint Speed
**Target:** < 500ms response time

```bash
# Using curl with timing
time curl -X POST https://your-app.vercel.app/api/user/tag/prepare \
  -H "Cookie: your-session-cookie"
```

### Test 2: Confirm Endpoint Speed
**Target:** < 500ms response time

```bash
time curl -X POST https://your-app.vercel.app/api/user/tag/confirm \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"pending_id": "uuid-here"}'
```

---

## Edge Cases

---

## Geolocation & Attendance Radius Tests (Nov 24, 2025)

### Test G1: Create Event With Geolocation Only
1. Create event with map location pinned (lat/long) but no radius.
2. Mark attendance from two different physical locations.
Expected: Both succeed (no restriction).

### Test G2: Create Event With 250m Radius
1. Create event with pinned location and radius slider at 250m.
2. Mark attendance within ~50m.
3. Move >300m away (simulate by editing client coordinates in dev tools) and attempt again.
Expected: First succeeds, second fails with outside radius message.

### Test G3: Boundary Distance
1. Event radius 250m.
2. Simulate coordinates exactly at calculated boundary (use haversine calculator).
Expected: Attendance allowed (<= comparison).

### Test G4: Geolocation Permission Denied
1. Event radius enabled.
2. In browser: Block location access.
3. Attempt scan.
Expected: Error: Cannot mark attendance without location (restricted event).

### Test G5: Missing Lat/Long With Radius (API Validation)
1. POST /api/event with attendance_radius_meters set but no latitude/longitude.
Expected: 400 error: latitude and longitude are required when attendance radius is set.

### Test G6: Invalid Radius Values
1. Try values 50 and 1500.
Expected: 400 validation error.

### Test G7: Update Event Radius
1. Create event with radius 250m.
2. Update event to 500m (ensure update API flow tested when implemented).
3. Attempt attendance beyond 250m but within 500m afterward.
Expected: Now succeeds after update.

### Test G8: High Accuracy vs. Approximate
1. Compare marking with enableHighAccuracy true vs false (manually modify code for experiment).
Expected: Both function; potential minor distance variance (<30m).

### Test G9: Fallback Without Geolocation Data
1. Temporarily remove geolocation block in AttendanceScanner.
2. Attempt marking without sending location coords while radius configured.
Expected: Server error: Location required.

### Test G10: Performance Under Radius
1. Mark 20 consecutive attendances inside radius.
Expected: No noticeable latency increase from distance calculation.


### Edge Case 1: Double Confirmation
**Test:** Try to confirm the same pending_id twice

**Expected:** 
- First confirm succeeds
- Second confirm fails with "Tag already confirmed"

---

### Edge Case 2: Wrong User's Pending ID
**Test:** User A tries to confirm User B's pending_id

**Expected:**
- Confirm fails with "Pending tag record not found"
- No database changes

---

### Edge Case 3: Malformed Pending ID
**Test:** Call confirm with invalid UUID

**Expected:**
- 400 Bad Request or 404 Not Found
- Clear error message

---

## Post-Testing Cleanup

### Cleanup Test Data

```sql
-- Remove test pending records
DELETE FROM user_tag_pending 
WHERE user_id = 'your-test-user-id';

-- Optional: Reset user's tag for fresh testing
UPDATE users 
SET tag_id = NULL 
WHERE id = 'your-test-user-id';

DELETE FROM user_tag_writes 
WHERE user_id = 'your-test-user-id';
```

---

## Success Criteria

All tests must pass:
- ✅ Successful tag generation works end-to-end
- ✅ Failed NFC writes do NOT corrupt database
- ✅ Cooldown is enforced correctly
- ✅ Pending tags expire after 5 minutes
- ✅ Cannot confirm expired tags
- ✅ Cannot confirm twice
- ✅ Retry after failure works
- ✅ Attendance scanning still works
- ✅ API endpoints respond quickly (<500ms)
- ✅ Error messages are clear and helpful

---

## Reporting Issues

If any test fails, report with:
1. Test scenario number
2. Expected vs actual result
3. Browser console errors (if any)
4. Database state (SQL query results)
5. Network tab screenshot (API responses)

---

**Testing Date:** ___________  
**Tested By:** ___________  
**Result:** ☐ Pass | ☐ Fail  
**Notes:** ___________________________________________
