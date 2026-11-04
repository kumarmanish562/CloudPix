package com.CoudPix.CloudPix_backend.dto;
import java.time.Instant;
import java.util.UUID;
public record SharedAlbumResponse(String title, Instant expiresAt, PageResponse<SharedPhoto> photos) {
    // Excludes owner-only metadata (tags, favorites, storage identifiers and hashes).
    public record SharedPhoto(UUID id, String fileName, String url, String thumbnailUrl, Integer width, Integer height) {}
}

