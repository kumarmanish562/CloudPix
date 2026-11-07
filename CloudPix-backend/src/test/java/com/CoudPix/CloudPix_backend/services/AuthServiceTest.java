package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.*;
import com.CoudPix.CloudPix_backend.dto.*;
import com.CoudPix.CloudPix_backend.exception.*;
import com.CoudPix.CloudPix_backend.repositories.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final AuthenticationManager authentication = mock(AuthenticationManager.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final JwtService jwt = mock(JwtService.class);
    private final RefreshTokenRotationService rotation = mock(RefreshTokenRotationService.class);
    private final EmailVerificationService emailVerification = mock(EmailVerificationService.class);
    private final AuthService service = new AuthService(users, tokens, authentication, passwords, jwt, rotation, emailVerification);

    @Test
    void emptyRefreshRequestsNeverReachTheDatabase() {
        assertThrows(UnauthorizedException.class, () -> service.refresh(null));
        assertThrows(UnauthorizedException.class, () -> service.refresh(new RefreshTokenRequest(null)));
        assertThrows(UnauthorizedException.class, () -> service.refresh(new RefreshTokenRequest(" ")));
        verifyNoInteractions(tokens, rotation, jwt);
    }

    @Test
    void unknownOrExpiredRefreshTokensNeverMintANewToken() {
        when(jwt.hashRefreshToken("old")).thenReturn("hash");
        when(rotation.consume("hash")).thenReturn(RefreshTokenRefreshResult.expiredResult());
        assertThrows(UnauthorizedException.class, () -> service.refresh(new RefreshTokenRequest("old")));
        verify(jwt, never()).generateRefreshToken();
        verify(tokens, never()).save(any());
    }

    @Test
    void logoutWithNoTokenIsAnIdempotentNoOp() {
        service.logout(null);
        service.logout(" ");
        verifyNoInteractions(jwt, tokens);
    }

    @Test
    void duplicateRegistrationUsesNormalizedEmailAndNeverHashesThePassword() {
        when(users.existsByEmail("owner@example.com")).thenReturn(true);
        assertThrows(ResourceConflictException.class,
                () -> service.register(new RegisterRequest(" OWNER@EXAMPLE.COM ", "password", "Owner")));
        verifyNoInteractions(passwords, jwt, tokens);
    }

    @Test
    void missingAccountsCannotReceiveRefreshedTokens() {
        assertThrows(UnauthorizedException.class, () -> service.createRefreshedAuthResponse(
                UUID.randomUUID(), "gone@example.com", "Gone", "access", "refresh"));
        verify(tokens, never()).save(any());
    }

    @Test
    void missingEmailAndDisappearingAccountsAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.login(new LoginRequest(" ", "password")));
        assertThrows(IllegalArgumentException.class, () -> service.register(new RegisterRequest(null, "password", "Owner")));
        assertThrows(UnauthorizedException.class, () -> service.login(new LoginRequest("missing@example.com", "password")));
    }
}

