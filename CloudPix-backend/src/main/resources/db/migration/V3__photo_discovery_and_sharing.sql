-- Keep V1/V2 immutable once deployed; extend the schema here.
ALTER TABLE photos ADD COLUMN favorite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE photos ADD COLUMN content_hash VARCHAR(64);
CREATE INDEX idx_photos_user_status_created ON photos (user_id, status, created_at DESC, id);
CREATE INDEX idx_photos_user_hash ON photos (user_id, content_hash);
CREATE TABLE photo_tags (
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    PRIMARY KEY (photo_id, tag)
);
CREATE INDEX idx_photo_tags_tag ON photo_tags (tag, photo_id);

-- Older releases could create duplicate memberships. Keep the earliest entry.
DELETE FROM album_photos WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY album_id, photo_id ORDER BY added_at, id
        ) AS membership_number FROM album_photos
    ) memberships WHERE membership_number > 1
);
ALTER TABLE album_photos ADD CONSTRAINT uk_album_photos_pair UNIQUE (album_id, photo_id);
ALTER TABLE album_photos DROP CONSTRAINT fk_album_photos_album;
ALTER TABLE album_photos ADD CONSTRAINT fk_album_photos_album
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE;
ALTER TABLE album_photos DROP CONSTRAINT fk_album_photos_photo;
ALTER TABLE album_photos ADD CONSTRAINT fk_album_photos_photo
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE;
ALTER TABLE albums DROP CONSTRAINT fk_albums_cover_photo;
ALTER TABLE albums ADD CONSTRAINT fk_albums_cover_photo
    FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL;

CREATE TABLE album_shares (
    id UUID PRIMARY KEY,
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_album_shares_album ON album_shares (album_id);

