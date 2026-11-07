package com.CoudPix.CloudPix_backend.dto;

import jakarta.validation.constraints.Size;

public record VerifyEmailRequest(
        @Size(max = 255)
        String token,

        @Size(max = 10)
        String code,

        String email
) {
}

