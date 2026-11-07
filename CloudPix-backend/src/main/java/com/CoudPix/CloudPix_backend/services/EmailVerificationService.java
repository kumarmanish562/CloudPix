package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.EmailVerificationToken;
import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.UserResponse;
import com.CoudPix.CloudPix_backend.dto.VerifyEmailRequest;
import com.CoudPix.CloudPix_backend.exception.BadRequestException;
import com.CoudPix.CloudPix_backend.exception.ResourceNotFoundException;
import com.CoudPix.CloudPix_backend.repositories.EmailVerificationTokenRepository;
import com.CoudPix.CloudPix_backend.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final int MAX_ATTEMPTS = 5;
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final UserService userService;

    public EmailVerificationService(
            EmailVerificationTokenRepository tokenRepository,
            UserRepository userRepository,
            EmailService emailService,
            UserService userService
    ) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.userService = userService;
    }

    @Transactional
    public EmailVerificationToken createAndSendVerification(User user) {
        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);

        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .user(user)
                .token(token)
                .code(code)
                .expiresAt(expiresAt)
                .build();

        EmailVerificationToken saved = tokenRepository.save(verificationToken);
        emailService.sendVerificationEmail(user, token, code);
        return saved;
    }

    @Transactional
    public UserResponse verifyEmail(VerifyEmailRequest request) {
        if (request == null) {
            throw new BadRequestException("Verification details are required");
        }

        if (request.token() != null && !request.token().isBlank()) {
            return verifyByToken(request.token().trim());
        }

        if (request.email() != null && !request.email().isBlank()
                && request.code() != null && !request.code().isBlank()) {
            return verifyByCode(request.email().trim(), request.code().trim());
        }

        throw new BadRequestException("Either a verification token or an email and 6-digit code must be provided");
    }

    private UserResponse verifyByToken(String tokenString) {
        EmailVerificationToken token = tokenRepository.findByToken(tokenString)
                .orElseThrow(() -> new BadRequestException("Invalid or unrecognized verification token"));

        if (token.isUsed()) {
            throw new BadRequestException("This verification token has already been used");
        }

        if (token.isExpired()) {
            throw new BadRequestException("Verification token has expired. Please request a new one.");
        }

        token.setUsedAt(Instant.now());
        tokenRepository.save(token);

        User user = token.getUser();
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(Instant.now());
        User savedUser = userRepository.save(user);

        log.info("User {} successfully verified email using token", user.getEmail());
        return userService.toUserResponse(savedUser);
    }

    private UserResponse verifyByCode(String email, String code) {
        String normalizedEmail = email.toLowerCase(Locale.ROOT).trim();
        List<EmailVerificationToken> activeTokens = tokenRepository.findActiveTokensByUserEmail(normalizedEmail);

        if (activeTokens.isEmpty()) {
            throw new BadRequestException("No active verification code found for this email. Please request a new one.");
        }

        EmailVerificationToken token = activeTokens.get(0);

        if (token.isExpired()) {
            throw new BadRequestException("Verification code has expired. Please request a new one.");
        }

        if (token.getAttempts() >= MAX_ATTEMPTS) {
            throw new BadRequestException("Too many incorrect attempts. Please request a new verification code.");
        }

        if (!token.getCode().equals(code)) {
            token.setAttempts(token.getAttempts() + 1);
            tokenRepository.save(token);
            throw new BadRequestException("Invalid verification code. Please check and try again.");
        }

        token.setUsedAt(Instant.now());
        tokenRepository.save(token);

        User user = token.getUser();
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(Instant.now());
        User savedUser = userRepository.save(user);

        log.info("User {} successfully verified email using 6-digit code", user.getEmail());
        return userService.toUserResponse(savedUser);
    }

    @Transactional
    public void resendVerification(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email address is required");
        }

        String normalizedEmail = email.toLowerCase(Locale.ROOT).trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email address"));

        if (user.isEmailVerified()) {
            throw new BadRequestException("This email address is already verified");
        }

        List<EmailVerificationToken> activeTokens = tokenRepository.findActiveTokensByUserId(user.getId());
        if (!activeTokens.isEmpty()) {
            EmailVerificationToken latest = activeTokens.get(0);
            Instant cooldownEnd = latest.getCreatedAt().plus(RESEND_COOLDOWN);
            if (Instant.now().isBefore(cooldownEnd)) {
                long secondsLeft = Duration.between(Instant.now(), cooldownEnd).getSeconds();
                throw new BadRequestException("Please wait " + Math.max(1, secondsLeft) + " seconds before requesting another verification email.");
            }
        }

        createAndSendVerification(user);
        log.info("Resent email verification token to {}", user.getEmail());
    }
}

