-- CloudPix performance indexes
-- Primary-key and unique-column indexes are already created
-- automatically by PostgreSQL.

-- Photos belonging to a user
CREATE INDEX idx_photos_user_id
    ON photos (user_id);

-- User photo listings ordered by creation time
CREATE INDEX idx_photos_user_created_at
    ON photos (user_id, created_at DESC);

-- Albums belonging to a user
CREATE INDEX idx_albums_user_id
    ON albums (user_id);

-- Cover-photo lookups
CREATE INDEX idx_albums_cover_photo_id
    ON albums (cover_photo_id);

-- Photos within an album
CREATE INDEX idx_album_photos_album_sort
    ON album_photos (album_id, sort_order);

-- Find albums containing a photo
CREATE INDEX idx_album_photos_photo_id
    ON album_photos (photo_id);

-- Find refresh tokens for a user
CREATE INDEX idx_refresh_tokens_user_id
    ON refresh_tokens (user_id);

-- Find expired refresh tokens during cleanup
CREATE INDEX idx_refresh_tokens_expires_at
    ON refresh_tokens (expires_at);