-- ============================================================================
-- TAG CONFIRMATION MIGRATION
-- Two-Phase Commit for Tag Writing
-- ============================================================================
-- Purpose: Prevent database/NFC tag desynchronization by implementing a
--          prepare/confirm flow for tag writes
-- Date: November 19, 2025
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: user_tag_pending
-- Stores temporary tag IDs awaiting NFC write confirmation
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_tag_pending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT tag_id_not_empty CHECK (length(tag_id) > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tag_pending_user_id ON user_tag_pending(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_pending_expires ON user_tag_pending(expires_at);
CREATE INDEX IF NOT EXISTS idx_tag_pending_confirmed ON user_tag_pending(confirmed, user_id);

COMMENT ON TABLE user_tag_pending IS 'Temporary storage for tag IDs pending NFC write confirmation';
COMMENT ON COLUMN user_tag_pending.expires_at IS 'Pending tags expire after 5 minutes if not confirmed';

-- ----------------------------------------------------------------------------
-- Function: prepare_tag_write
-- Purpose: Generate a new tag ID and store it as pending confirmation
-- Parameters: p_user_id - The user's UUID
-- Returns: JSON object with tag_id, pending_id, and expires_at
-- Note: Does not update users table until confirmed
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prepare_tag_write(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_new_tag_id UUID;
    v_pending_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_can_write_result JSON;
    v_can_write BOOLEAN;
BEGIN
    -- Check if user can write a new tag
    v_can_write_result := can_user_write_tag(p_user_id);
    v_can_write := (v_can_write_result->>'can_write')::BOOLEAN;
    
    IF NOT v_can_write THEN
        RAISE EXCEPTION 'Cannot write tag. Cooldown period not elapsed. Next available: %', 
            v_can_write_result->>'next_available_date';
    END IF;
    
    -- Check for existing unconfirmed pending tags
    DELETE FROM user_tag_pending 
    WHERE user_id = p_user_id 
      AND confirmed = FALSE 
      AND expires_at > NOW();
    
    -- Generate new UUID for tag
    v_new_tag_id := gen_random_uuid();
    v_expires_at := NOW() + INTERVAL '5 minutes';
    
    -- Insert into pending table
    INSERT INTO user_tag_pending (user_id, tag_id, expires_at)
    VALUES (p_user_id, v_new_tag_id::TEXT, v_expires_at)
    RETURNING id INTO v_pending_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'tag_id', v_new_tag_id::TEXT,
        'pending_id', v_pending_id,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION prepare_tag_write IS 'Prepares a new tag ID for writing without committing to user record';

-- ----------------------------------------------------------------------------
-- Function: confirm_tag_write
-- Purpose: Confirm a pending tag write and update user record
-- Parameters: 
--   p_user_id - The user's UUID
--   p_pending_id - The pending record ID
-- Returns: JSON object with success status and write record
-- Note: Only succeeds if pending record is valid and not expired
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION confirm_tag_write(
    p_user_id UUID,
    p_pending_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_tag_id TEXT;
    v_write_record_id UUID;
    v_expired BOOLEAN;
    v_already_confirmed BOOLEAN;
BEGIN
    -- Fetch the pending record
    SELECT 
        tag_id,
        expires_at < NOW() AS is_expired,
        confirmed
    INTO v_tag_id, v_expired, v_already_confirmed
    FROM user_tag_pending
    WHERE id = p_pending_id 
      AND user_id = p_user_id;
    
    -- Check if record exists
    IF v_tag_id IS NULL THEN
        RAISE EXCEPTION 'Pending tag record not found';
    END IF;
    
    -- Check if expired
    IF v_expired THEN
        RAISE EXCEPTION 'Pending tag has expired. Please generate a new one.';
    END IF;
    
    -- Check if already confirmed
    IF v_already_confirmed THEN
        RAISE EXCEPTION 'Tag already confirmed';
    END IF;
    
    -- Update user's tag_id
    UPDATE users 
    SET tag_id = v_tag_id,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record the tag write in history
    INSERT INTO user_tag_writes (user_id, tag_id, written_at)
    VALUES (p_user_id, v_tag_id, NOW())
    RETURNING id INTO v_write_record_id;
    
    -- Mark pending record as confirmed
    UPDATE user_tag_pending
    SET confirmed = TRUE,
        confirmed_at = NOW()
    WHERE id = p_pending_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'tag_id', v_tag_id,
        'write_record_id', v_write_record_id,
        'written_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION confirm_tag_write IS 'Confirms a pending tag write after successful NFC write';

-- ----------------------------------------------------------------------------
-- Function: cleanup_expired_pending_tags
-- Purpose: Remove expired pending tags (can be run periodically)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cleanup_expired_pending_tags()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM user_tag_pending
    WHERE expires_at < NOW() 
      AND confirmed = FALSE;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_pending_tags IS 'Removes expired unconfirmed pending tags';
