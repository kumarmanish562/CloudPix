package com.CoudPix.CloudPix_backend.dto;

import jakarta.validation.constraints.NotNull;



public record AiTransformRequest(
        @NotNull AiTransformType type,
        String prompt,
        Integer width,
        Integer height,
        String focusObject
) {
}