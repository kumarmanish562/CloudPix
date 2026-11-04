package com.CoudPix.CloudPix_backend.services;

import java.util.UUID;

public record RefreshTokenRefreshResult(
        UUID userId,
        String email,
        String displayName,
        boolean tokenExpired
) {
    public static RefreshTokenRefreshResult expiredResult() {
        return new RefreshTokenRefreshResult(
                null, null, null, true
        );
    }

    public static RefreshTokenRefreshResult success(
            UUID userId,
            String email,
            String displayName
    ) {
        return new RefreshTokenRefreshResult(
                userId, email, displayName, false
        );
    }
}