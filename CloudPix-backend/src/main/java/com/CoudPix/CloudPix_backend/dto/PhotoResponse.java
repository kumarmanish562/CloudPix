package com.CoudPix.CloudPix_backend.dto;

import com.CoudPix.CloudPix_backend.domain.AiTransformType;
import com.CoudPix.CloudPix_backend.domain.PhotoStatus;

import java.time.Instant;
import java.util.UUID;


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
        AiTransformType aiTransformType
)
{

}