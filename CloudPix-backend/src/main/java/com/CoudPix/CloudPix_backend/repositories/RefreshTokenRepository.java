package com.CoudPix.CloudPix_backend.repositories;

import java.util.Optional;
import java.util.UUID;

import com.CoudPix.CloudPix_backend.domain.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByToken(String token);

    void deleteByUserId(UUID userId);

}
