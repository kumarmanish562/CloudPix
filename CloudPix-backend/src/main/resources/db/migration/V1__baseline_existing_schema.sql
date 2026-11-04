-- CloudPix initial database schema
-- PostgreSQL
-- Intended for a fresh, empty database.

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE photos (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    imagekit_file_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    mime_type VARCHAR(100),
    size_bytes BIGINT NOT NULL DEFAULT 0,
    width INTEGER,
    height INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    parent_photo_id UUID,
    ai_transform_type VARCHAR(50),

    CONSTRAINT fk_photos_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE albums (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    cover_photo_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_albums_user
        FOREIGN KEY (user_id) REFERENCES users(id),

    CONSTRAINT fk_albums_cover_photo
        FOREIGN KEY (cover_photo_id) REFERENCES photos(id)
);

CREATE TABLE album_photos (
    id UUID PRIMARY KEY,
    album_id UUID NOT NULL,
    photo_id UUID NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_album_photos_album
        FOREIGN KEY (album_id) REFERENCES albums(id),

    CONSTRAINT fk_album_photos_photo
        FOREIGN KEY (photo_id) REFERENCES photos(id)
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_refresh_tokens_token UNIQUE (token),

    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);