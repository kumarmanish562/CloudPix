package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.EmailVerificationToken;
import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.UserResponse;
import com.CoudPix.CloudPix_backend.dto.VerifyEmailRequest;
import com.CoudPix.CloudPix_backend.exception.BadRequestException;
import com.CoudPix.CloudPix_backend.exception.ResourceNotFoundException;
import com.CoudPix.CloudPix_backend.repositories.EmailVerificationTokenRepository;
import com.CoudPix.CloudPix_backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class EmailVerificationServiceTest {

    private EmailVerificationTokenRepository tokenRepository;
    private UserRepository userRepository;
    private EmailService emailService;
    private UserService userService;
    private EmailVerificationService service;

    private User testUser;

    @BeforeEach
    void setUp() {
        tokenRepository = mock(EmailVerificationTokenRepository.class);
        userRepository = mock(UserRepository.class);
        emailService = mock(EmailService.class);
        userService = mock(UserService.class);

        service = new EmailVerificationService(tokenRepository, userRepository, emailService, userService);

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .displayName("Test User")
                .passwordHash("hashed")
                .emailVerified(false)
                .build();
    }

    @Test
    void createAndSendVerificationGeneratesTokenAndCallsEmailService() {
        when(tokenRepository.save(any(EmailVerificationToken.class))).thenAnswer(i -> i.getArgument(0));

        EmailVerificationToken token = service.createAndSendVerification(testUser);

        assertNotNull(token.getToken());
        assertEquals(6, token.getCode().length());
        assertTrue(token.getExpiresAt().isAfter(Instant.now()));
        verify(emailService).sendVerificationEmail(eq(testUser), eq(token.getToken()), eq(token.getCode()));
        verify(tokenRepository).save(any(EmailVerificationToken.class));
    }

    @Test
    void verifyByTokenSuccess() {
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .token("valid-token")
                .code("123456")
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();

        when(tokenRepository.findByToken("valid-token")).thenReturn(Optional.of(token));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(userService.toUserResponse(any(User.class))).thenReturn(new UserResponse(testUser.getId(), testUser.getEmail(), testUser.getDisplayName(), true));

        UserResponse response = service.verifyEmail(new VerifyEmailRequest("valid-token", null, null));

        assertTrue(response.emailVerified());
        assertTrue(testUser.isEmailVerified());
        assertNotNull(testUser.getEmailVerifiedAt());
        assertNotNull(token.getUsedAt());
        verify(tokenRepository).save(token);
        verify(userRepository).save(testUser);
    }

    @Test
    void verifyByTokenFailsWhenExpired() {
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .token("expired-token")
                .code("123456")
                .expiresAt(Instant.now().minus(1, ChronoUnit.HOURS))
                .build();

        when(tokenRepository.findByToken("expired-token")).thenReturn(Optional.of(token));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.verifyEmail(new VerifyEmailRequest("expired-token", null, null)));
        assertTrue(ex.getMessage().contains("expired"));
        assertFalse(testUser.isEmailVerified());
    }

    @Test
    void verifyByTokenFailsWhenAlreadyUsed() {
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .token("used-token")
                .code("123456")
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .usedAt(Instant.now().minus(5, ChronoUnit.MINUTES))
                .build();

        when(tokenRepository.findByToken("used-token")).thenReturn(Optional.of(token));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.verifyEmail(new VerifyEmailRequest("used-token", null, null)));
        assertTrue(ex.getMessage().contains("already been used"));
    }

    @Test
    void verifyByCodeSuccess() {
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .token("token")
                .code("654321")
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();

        when(tokenRepository.findActiveTokensByUserEmail("user@example.com")).thenReturn(List.of(token));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(userService.toUserResponse(any(User.class))).thenReturn(new UserResponse(testUser.getId(), testUser.getEmail(), testUser.getDisplayName(), true));

        UserResponse response = service.verifyEmail(new VerifyEmailRequest(null, "654321", "user@example.com"));

        assertTrue(response.emailVerified());
        assertTrue(testUser.isEmailVerified());
        assertNotNull(token.getUsedAt());
    }

    @Test
    void verifyByCodeIncrementsAttemptsOnMismatch() {
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .token("token")
                .code("654321")
                .attempts(1)
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();

        when(tokenRepository.findActiveTokensByUserEmail("user@example.com")).thenReturn(List.of(token));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.verifyEmail(new VerifyEmailRequest(null, "000000", "user@example.com")));
        assertTrue(ex.getMessage().contains("Invalid verification code"));
        assertEquals(2, token.getAttempts());
        verify(tokenRepository).save(token);
        assertFalse(testUser.isEmailVerified());
    }

    @Test
    void verifyByCodeBlocksAfterMaxAttempts() {
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .token("token")
                .code("654321")
                .attempts(5)
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();

        when(tokenRepository.findActiveTokensByUserEmail("user@example.com")).thenReturn(List.of(token));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.verifyEmail(new VerifyEmailRequest(null, "654321", "user@example.com")));
        assertTrue(ex.getMessage().contains("Too many incorrect attempts"));
    }

    @Test
    void resendVerificationRespectsCooldown() {
        EmailVerificationToken recentToken = EmailVerificationToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .token("recent")
                .code("111111")
                .createdAt(Instant.now().minus(20, ChronoUnit.SECONDS))
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));
        when(tokenRepository.findActiveTokensByUserId(testUser.getId())).thenReturn(List.of(recentToken));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.resendVerification("user@example.com"));
        assertTrue(ex.getMessage().contains("Please wait"));
        verify(emailService, never()).sendVerificationEmail(any(), any(), any());
    }

    @Test
    void resendVerificationRejectsAlreadyVerifiedUser() {
        testUser.setEmailVerified(true);
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.resendVerification("user@example.com"));
        assertTrue(ex.getMessage().contains("already verified"));
    }

    @Test
    void resendVerificationThrowsWhenUserNotFound() {
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.resendVerification("ghost@example.com"));
    }
}

