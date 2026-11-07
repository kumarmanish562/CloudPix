package com.CoudPix.CloudPix_backend.repositories;

import com.CoudPix.CloudPix_backend.domain.AlbumShare;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface AlbumShareRepository extends JpaRepository<AlbumShare, UUID> {
    Optional<AlbumShare> findByTokenHash(String tokenHash);
    List<AlbumShare> findByAlbumIdOrderByCreatedAtDesc(UUID albumId);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COUNT(s) FROM AlbumShare s
            WHERE s.album.user.id = :userId AND s.revoked = false AND s.expiresAt > CURRENT_TIMESTAMP
            """)
    long countActiveSharesByUserId(UUID userId);
}

