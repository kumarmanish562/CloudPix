package com.CoudPix.CloudPix_backend.dto;


public record AiTransformPreviewResponse(
        String previewUrl,
        AiTransformType type,
        String transformChain
) {
}
