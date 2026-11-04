package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.RefreshToken;
import com.CoudPix.CloudPix_backend.repositories.RefreshTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ExpiredRefreshTokenCleanupService {

    private final RefreshTokenRepository refreshTokenRepository;

    public ExpiredRefreshTokenCleanupService(
            RefreshTokenRepository refreshTokenRepository
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteExpiredToken(UUID tokenId) {
        refreshTokenRepository.findById(tokenId)
                .filter(token ->
                        !token.getExpiresAt()
                                .isAfter(java.time.Instant.now())
                )
                .ifPresent(refreshTokenRepository::delete);
    }
}