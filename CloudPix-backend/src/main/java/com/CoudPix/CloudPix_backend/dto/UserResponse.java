package com.CoudPix.CloudPix_backend.dto;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String displayName,
        boolean emailVerified
) {
    public UserResponse(UUID id, String email, String displayName) {
        this(id, email, displayName, false);
    }
}
