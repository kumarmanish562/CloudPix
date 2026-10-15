package com.CoudPix.CloudPix_backend.dto;

import com.CoudPix.CloudPix_backend.domain.AiTransformType;
import jakarta.validation.constraints.NotNull;



public record AiTransformRequest(
        @NotNull AiTransformType type,
        String prompt,
        Integer width,
        Integer height,
        String focusObject
) {
}