package com.CoudPix.CloudPix_backend.dto;


import com.CoudPix.CloudPix_backend.domain.AiTransformType;

public record AiTransformPreviewResponse(
        String previewUrl,
        AiTransformType type,
        String transformChain
) {
}
