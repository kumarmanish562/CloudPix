package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.*;
import com.CoudPix.CloudPix_backend.repositories.RefreshTokenRepository;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TokenMaintenanceServiceTest {
    private final RefreshTokenRepository repository = mock(RefreshTokenRepository.class);
    private final RefreshTokenRotationService rotation = new RefreshTokenRotationService(repository);
    private final ExpiredRefreshTokenCleanupService cleanup = new ExpiredRefreshTokenCleanupService(repository);

    @Test
    void missingRefreshTokenIsExpiredWithoutDeletingAnything() {
        assertTrue(rotation.consume("missing").tokenExpired());
        verify(repository, never()).delete(any());
        verify(repository, never()).flush();
    }

    @Test
    void expiredTokenIsConsumedAndFlushed() {
        var token = RefreshToken.builder().expiresAt(Instant.now().minusSeconds(60)).build();
        when(repository.findByTokenHashForUpdate("expired")).thenReturn(Optional.of(token));
        assertTrue(rotation.consume("expired").tokenExpired());
        var calls = inOrder(repository);
        calls.verify(repository).findByTokenHashForUpdate("expired");
        calls.verify(repository).delete(token);
        calls.verify(repository).flush();
    }

    @Test
    void validTokenReturnsUserScalarsAndConsumesTheOldToken() {
        var user = User.builder().id(UUID.randomUUID()).email("owner@example.com").displayName("Owner").build();
        var token = RefreshToken.builder().user(user).expiresAt(Instant.now().plusSeconds(3600)).build();
        when(repository.findByTokenHashForUpdate("valid")).thenReturn(Optional.of(token));
        var result = rotation.consume("valid");
        assertFalse(result.tokenExpired());
        assertEquals(user.getId(), result.userId());
        assertEquals(user.getEmail(), result.email());
        assertEquals(user.getDisplayName(), result.displayName());
        verify(repository).delete(token);
        verify(repository).flush();
    }

    @Test
    void cleanupDeletesExpiredTokens() {
        UUID id = UUID.randomUUID();
        var token = RefreshToken.builder().id(id).expiresAt(Instant.now().minusSeconds(60)).build();
        when(repository.findById(id)).thenReturn(Optional.of(token));
        cleanup.deleteExpiredToken(id);
        verify(repository).delete(token);
    }

    @Test
    void cleanupPreservesUnexpiredTokens() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(RefreshToken.builder().expiresAt(Instant.now().plusSeconds(3600)).build()));
        cleanup.deleteExpiredToken(id);
        verify(repository, never()).delete(any());
    }

    @Test
    void cleanupIsIdempotentWhenTheTokenIsAlreadyGone() {
        cleanup.deleteExpiredToken(UUID.randomUUID());
        verify(repository, never()).delete(any());
    }
}

