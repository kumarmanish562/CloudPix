package com.CoudPix.CloudPix_backend.dto;

import java.time.Instant;
import java.util.UUID;
import java.util.Set;


public record PhotoResponse(
        UUID id,
        String imagekitFileId,
        String fileName,
        String url,
        String thumbnailUrl,
        String mimeType,
        Long sizeBytes,
        Integer width,
        Integer height,
        PhotoStatus status,
        Instant createdAt,
        Instant deletedAt,
        UUID parentPhotoId,
        AiTransformType aiTransformType,
        boolean favorite,
        Set<String> tags,
        String contentHash
)
{

}
