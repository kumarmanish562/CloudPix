
package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.RefreshToken;
import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.repositories.RefreshTokenRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class RefreshTokenRotationService {

    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenRotationService(
            RefreshTokenRepository refreshTokenRepository
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional
    public RefreshTokenRefreshResult consume(String tokenHash) {

        RefreshToken storedToken =
                refreshTokenRepository
                        .findByTokenHashForUpdate(tokenHash)
                        .orElse(null);

        if (storedToken == null) {
            return RefreshTokenRefreshResult.expiredResult();
        }

        if (!storedToken.getExpiresAt().isAfter(Instant.now())) {
            refreshTokenRepository.delete(storedToken);
            refreshTokenRepository.flush();

            return RefreshTokenRefreshResult.expiredResult();
        }

        // Read the required user fields while the transaction is active.
        User user = storedToken.getUser();

        UUID userId = user.getId();
        String email = user.getEmail();
        String displayName = user.getDisplayName();

        // Consume the old refresh token exactly once.
        refreshTokenRepository.delete(storedToken);
        refreshTokenRepository.flush();

        return RefreshTokenRefreshResult.success(
                userId,
                email,
                displayName
        );
    }
}
