package com.CoudPix.CloudPix_backend.repositories;

import com.CoudPix.CloudPix_backend.domain.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {

    Optional<EmailVerificationToken> findByToken(String token);

    @Query("SELECT t FROM EmailVerificationToken t WHERE t.user.id = :userId AND t.usedAt IS NULL ORDER BY t.createdAt DESC")
    List<EmailVerificationToken> findActiveTokensByUserId(@Param("userId") UUID userId);

    @Query("SELECT t FROM EmailVerificationToken t WHERE LOWER(t.user.email) = LOWER(:email) AND t.usedAt IS NULL ORDER BY t.createdAt DESC")
    List<EmailVerificationToken> findActiveTokensByUserEmail(@Param("email") String email);
}

