# Tag Rotation System - Correct Implementation

## Core Principle

**Users can ONLY write to an NFC tag when the cooldown allows it.**

This means:
- ✅ First-time users: Can write immediately (no previous tag)
- ✅ After 14 days: Can write a NEW unique tag
- ❌ During cooldown: CANNOT write anything to any tag

## What This Prevents

### ❌ Wrong Implementation (What We Fixed)
```
User writes Tag A → 2 days pass → User loses card
→ User clicks "Write Existing ID to Tag"
→ User writes Tag A to new card (bypasses rotation!)
→ Security compromised: User never rotates their tag
```

### ✅ Correct Implementation (Current)
```
User writes Tag A → 2 days pass → User loses card
→ UI shows "New Tag Available in 12 Days"
→ User CANNOT write to any card
→ User must wait 12 more days OR find original card
→ After 14 days: User generates Tag B (new unique ID)
```

## User Flow Examples

### Example 1: First-Time User (Alice)

**Day 1:**
- Alice creates account
- Database: `tag_id = NULL`
- UI: "No Tag Assigned" ⚠️
- Button: "Program New Tag" ✅ ENABLED

**Alice clicks button:**
1. System prepares UUID: `550e8400-...`
2. Alice taps blank NFC card
3. UUID written to card
4. Database updated: `tag_id = '550e8400-...'`
5. Cooldown starts: Next write available = Day 15

**Days 2-14:**
- Alice uses her card for attendance
- UI: "Active Tag Assigned" ✅
- Button: "New Tag Available in X Days" 🔒 DISABLED

**Day 15:**
- Button: "Program New Tag" ✅ ENABLED
- Alice can rotate to a new ID if she wants

---

### Example 2: User Loses Card During Cooldown (Bob)

**Day 1:**
- Bob writes tag: `7c9e6679-...`
- Cooldown starts

**Day 5:**
- Bob loses his NFC card 😢
- Bob tries to use the system
- UI: "New Tag Available in 9 Days" 🔒
- Bob CANNOT write to a replacement card

**Bob's Options:**
1. **Wait 9 days** → Generate new tag with new ID
2. **Find original card** → Continue using it
3. **Contact admin** → Manual database reset (not recommended)

**What Bob CANNOT Do:**
- ❌ Write the existing ID to a new card
- ❌ Bypass the cooldown
- ❌ Generate a new tag before cooldown ends

**Why This Is Correct:**
- Prevents abuse: Users can't reset their tag by claiming "lost card"
- Enforces rotation: Every write is tracked and rate-limited
- Security: Makes tag cloning less viable (clones expire after 14 days max)

---

### Example 3: Regular Rotation (Carol)

**Day 1:**
- Carol writes tag: `a1b2c3d4-...`

**Day 15:**
- Carol clicks "Program New Tag"
- System generates: `b2c3d4e5-...`
- Carol taps her SAME physical card
- New ID overwrites old ID on card
- Database: Old `a1b2c3d4-...` → New `b2c3d4e5-...`

**Day 16:**
- Someone with a cloned card (has old ID `a1b2c3d4-...`)
- They try to check in
- System rejects: "User not found with this tag"
- Clone is useless!

---

## Why This Design?

### Security Benefits

1. **Prevents Tag Reuse Abuse**
   - Can't claim "lost card" to reset rotation
   - Can't share a card and generate backups
   - Every write is strictly controlled

2. **Forces Regular Rotation**
   - Users must rotate every 14 days to maintain access
   - Old tags automatically become invalid
   - Cloning is only useful for max 14 days

3. **Audit Trail**
   - Every tag write is logged with timestamp
   - No way to write without creating a record
   - Can track if user is rotating regularly

4. **Rate Limiting**
   - Prevents spam tag generation
   - Prevents database pollution
   - Ensures system scalability

### Tradeoffs

**Disadvantage: Lost Card Problem**
- If user loses card during cooldown, they're locked out
- Must wait until cooldown ends to generate new tag
- Could be frustrating for users

**Mitigation Options:**
1. **Admin Override:** Admins can manually reset cooldown (not implemented)
2. **Shorter Cooldown:** Reduce from 14 to 7 days (configurable)
3. **Emergency Reset:** One-time skip cooldown (requires approval)
4. **Backup Code:** Generate a secondary QR code that doesn't expire (future)

**Why We Don't Allow "Write Existing ID":**
- Opens door to abuse
- Users could share cards by copying IDs
- Defeats the entire purpose of rotation
- No way to track if card was truly "lost"

---

## Configuration

### Adjusting Cooldown Period

If 14 days is too strict for your use case:

**Option 1: Reduce Cooldown (Recommended)**
```sql
-- In tag_confirmation_migration.sql
v_cooldown_days INTEGER := 7; -- Change from 14 to 7
```

```typescript
// In src/lib/constants.ts
export const TAG_WRITE_COOLDOWN_DAYS = 7; // Change from 14 to 7
```

**Option 2: Implement Admin Override (Future)**
- Allow admins to reset user cooldown
- Require admin approval
- Log all overrides for audit

**Option 3: Add Emergency Reset (Future)**
- Allow 1 emergency reset per year
- Requires email verification
- Logs the event

---

## Comparison with Other Systems

### System A: No Rotation (Static IDs)
```
User gets ID: abc123
User keeps ID forever
→ If cloned, clone works FOREVER
→ Very insecure
```

### System B: Rotation with Bypass (What We Fixed)
```
User writes ID every 14 days
User can also write existing ID anytime
→ Users bypass rotation by claiming "lost card"
→ Partially secure
```

### System C: Strict Rotation (Current Implementation) ✅
```
User writes ID every 14 days
User CANNOT write during cooldown
→ Enforced rotation, no bypasses
→ Maximum security
→ Tradeoff: Lost card = locked out until cooldown
```

---

## FAQ

**Q: What if a user legitimately loses their card?**
A: They must wait until cooldown ends. This is intentional to prevent abuse. Consider reducing cooldown period if this is a common issue.

**Q: Can we add a "lost card" exception?**
A: Not recommended. Users could abuse this to bypass rotation. If needed, implement admin-only override with approval workflow.

**Q: Why not allow one-time bypass?**
A: How do you verify the card was truly lost? Users could use this to share cards or bypass security.

**Q: What about QR codes?**
A: Same rules apply. QR codes use the same `tag_id` and are subject to the same cooldown.

**Q: Can users have multiple tags?**
A: Not currently. This could be added as a future feature (primary + backup tag), but would require careful design to prevent abuse.

---

## Summary

✅ **What the system does:**
- Generates NEW unique tag ID every 14 days
- User writes new ID to SAME physical card (overwrites old ID)
- Old ID becomes invalid immediately
- Cooldown strictly enforced - NO writes during cooldown period

✅ **Security benefits:**
- Prevents tag reuse abuse
- Forces regular rotation
- Complete audit trail
- Rate limiting

⚠️ **Tradeoff:**
- Lost card during cooldown = user locked out until cooldown ends
- This is intentional to prevent abuse

🔧 **If too strict:**
- Reduce cooldown from 14 to 7 days
- Or implement admin override system
- Or add backup tag feature

---

**Implementation Status:** ✅ Complete and Correct
**Last Updated:** November 19, 2025
