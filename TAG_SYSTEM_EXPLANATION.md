# Tag Management System Explanation

## Your Goal vs Current Implementation

### What You Wanted
> "The user can write to a single tag every 2 weeks, not have to write to a new tag, but only allow the user to write to a tag every 2 weeks. When the user re-writes to a tag, it writes a new tag ID as a whole, making sure that every time the user writes to a tag it's unique."

### What the System Actually Does ✅

**Good news: The system already works exactly as you described!**

You were correct in your understanding, but there was confusion about what "creating a new tag" means. Let me clarify:

## How It Actually Works

### Physical Tags (NFC Cards)
- **You use THE SAME physical NFC card forever** 
- You don't need to buy new cards
- One card per user, reused indefinitely

### Tag IDs (Digital Identity)
- **Every 14 days, you generate a NEW random UUID**
- **You write this new UUID to your SAME physical card**
- The old UUID becomes invalid
- Only the latest UUID works for attendance

## The Process Step by Step

### First Time Setup
1. User gets **one physical NFC card** (white blank card)
2. User clicks "Program New Tag" in the system
3. System generates a random UUID: `a7f2d8e9-...`
4. User taps their card to their phone
5. UUID `a7f2d8e9-...` is written to the card
6. User can now use this card for attendance

### After 14 Days
1. User clicks "Program New Tag" again
2. System generates a **NEW** random UUID: `b8e3f9a1-...`
3. User taps **THE SAME physical card** to their phone
4. The NEW UUID `b8e3f9a1-...` **overwrites** the old one
5. The old UUID `a7f2d8e9-...` no longer works
6. User continues using the same card with the new ID

## Why This Is Secure

### Rotation Prevents Cloning
```
Week 1: Card contains UUID A → Valid for attendance
Week 2: Card contains UUID A → Valid for attendance
[14 days pass]
Week 3: Card contains UUID B → Valid for attendance
        Old UUID A → INVALID (even if someone copied it)
```

If someone cloned your card in Week 1:
- They have UUID A on their cloned card
- After 14 days, you rotate to UUID B
- Your original card now has UUID B (valid)
- Their cloned card still has UUID A (invalid)
- They can't mark attendance anymore

### Why Every 14 Days?
- **Too short**: Annoying for users to reprogram constantly
- **Too long**: Cloned cards remain valid for too long
- **14 days**: Good balance between security and convenience

## The Confirmation System (NEW)

### The Problem We Just Fixed
**Before this update:**
1. System generates new UUID and saves to database
2. User tries to write to NFC card
3. ❌ **NFC write fails** (user cancelled, phone moved, etc.)
4. ❌ Database has UUID B, but card still has UUID A
5. ❌ User's card doesn't work anymore!

**After this update:**
1. System generates new UUID (**NOT saved yet**)
2. User writes to NFC card
3. ✅ **NFC write succeeds** → System saves UUID to database
4. ❌ **NFC write fails** → System discards UUID, database unchanged
5. ✅ User's card always matches the database

## Real-World Example

### Alice's Journey

**Day 1 - Initial Setup**
- Alice gets a blank NFC card
- She opens the app, clicks "Program New Tag"
- System prepares UUID: `550e8400-e29b-41d4-a716-446655440000`
- Alice taps her card to her Android phone
- UUID is written to the card
- System confirms and saves UUID to database
- ✅ Alice's card is ready to use

**Days 2-14 - Daily Use**
- Alice taps her card at events
- Scanner reads: `550e8400-e29b-41d4-a716-446655440000`
- System marks her as present
- Everything works perfectly

**Day 15 - Rotation Time**
- Alice opens the app
- System says "New Tag Available"
- She clicks "Program New Tag"
- System prepares NEW UUID: `7c9e6679-7425-40de-944b-e07fc1f90ae7`
- Alice taps **THE SAME physical card**
- New UUID overwrites the old one on the card
- System confirms and saves new UUID
- ✅ Old UUID is now invalid

**What if Alice's phone dies during writing?**
- System prepared UUID: `7c9e6679-7425-40de-944b-e07fc1f90ae7`
- Phone battery dies mid-write
- NFC write fails
- System **does NOT save** the new UUID to database
- Alice's database still has old UUID: `550e8400-...`
- ✅ Alice's card still has old UUID: `550e8400-...`
- ✅ They still match! Card still works!
- Alice can try again when phone is charged

**Day 30 - Another Rotation**
- Repeat the process with a NEW UUID
- Same physical card, different UUID
- Pattern continues forever

## Security Features

### 1. Unique IDs Every Time
✅ Every rotation generates a **brand new random UUID**
✅ UUIDs are cryptographically random (gen_random_uuid())
✅ Impossible to predict the next UUID

### 2. Cooldown Protection  
✅ Can only rotate every 14 days
✅ Prevents spam/abuse
✅ Enforced at database level (can't be bypassed)

### 3. Automatic Invalidation
✅ Old UUIDs immediately become invalid
✅ No grace period for cloned cards
✅ Only the latest UUID works

### 4. Write Confirmation (NEW)
✅ Database only updates if NFC write succeeds
✅ No desynchronization between card and database
✅ Failed writes are safe and can be retried

### 5. History Tracking
✅ All rotations are logged with timestamps
✅ Can audit when UUIDs were changed
✅ Can detect suspicious patterns

## Common Questions

### Q: Do I need a new physical card every 14 days?
**A: No!** You use the same physical card forever. Only the ID stored on it changes.

### Q: What if I lose my card?
**A: You have two options:**
1. **Before 14 days have passed**: Unfortunately, you cannot write to a new card until the cooldown period ends. You'll need to wait until you can generate a new tag.
2. **After 14 days**: Generate a new tag ID and write it to your new card.

**Important:** There is no "write existing ID to replacement card" feature. This is intentional for security - it ensures that every tag write is tracked and subject to cooldown enforcement.

### Q: Can someone copy my card?
**A: Yes, but it's useless after 14 days.** When you rotate to a new UUID, their copied card becomes invalid.

### Q: What if the NFC write fails?
**A: No problem!** The new system ensures your database isn't updated, so you can safely retry.

### Q: Can I share my card?
**A: Technically yes, but:**
- It's tied to your account
- Attendance records will show YOUR name
- This defeats the purpose of attendance tracking
- May violate your organization's policies
- **Remember:** You cannot generate a new tag until 14 days pass, so losing access to your card means you cannot check in until cooldown ends

### Q: What happens to old UUIDs?
**A: They're stored in history** (`user_tag_writes` table) but are no longer valid for attendance.

## Technical Summary

### Database Tables
- **`users.tag_id`**: Current active UUID (only this one works)
- **`user_tag_writes`**: History of all UUIDs (for cooldown and audit)
- **`user_tag_pending`**: Temporary UUIDs awaiting NFC confirmation

### Key Constraints
- UUID must be unique across all users
- 14-day cooldown between rotations
- 5-minute expiration for pending writes
- Cannot confirm expired or already-confirmed writes

### Write Flow
```
User Action → Prepare UUID → Write to NFC → Confirm in DB
              (pending)       (physical)     (active)
```

### Failure Handling
```
Prepare Fails → Error shown, try again
NFC Write Fails → Pending expires, database unchanged, try again
Confirm Fails → Rare, indicates UUID already confirmed or expired
```

## Conclusion

Your understanding was **100% correct**! The system:
- ✅ Uses the same physical tag
- ✅ Generates a new unique ID every 14 days
- ✅ Overwrites the old ID on the same tag
- ✅ Ensures each write creates a unique, unpredictable UUID
- ✅ Now has confirmation to prevent write failures from breaking the system

The confusion was just terminology - "creating a new tag" means "creating a new TAG ID," not "buying a new physical card."
