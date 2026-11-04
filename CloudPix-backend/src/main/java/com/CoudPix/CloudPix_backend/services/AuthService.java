
package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.RefreshToken;
import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.AuthResponse;
import com.CoudPix.CloudPix_backend.dto.LoginRequest;
import com.CoudPix.CloudPix_backend.dto.RefreshTokenRequest;
import com.CoudPix.CloudPix_backend.dto.RegisterRequest;
import com.CoudPix.CloudPix_backend.dto.UserResponse;
import com.CoudPix.CloudPix_backend.exception.ResourceConflictException;
import com.CoudPix.CloudPix_backend.exception.UnauthorizedException;
import com.CoudPix.CloudPix_backend.repositories.RefreshTokenRepository;
import com.CoudPix.CloudPix_backend.repositories.UserRepository;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenRotationService refreshTokenRotationService;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenRotationService refreshTokenRotationService
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenRotationService = refreshTokenRotationService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new ResourceConflictException(
                    "An account with this email already exists"
            );
        }

        User user = User.builder()
                .email(email)
                .passwordHash(
                        passwordEncoder.encode(request.password())
                )
                .displayName(request.displayName().trim())
                .build();

        User savedUser = userRepository.save(user);

        return createAuthResponse(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.password()
                )
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException(
                        "Invalid email or password"
                ));

        return createAuthResponse(user);
    }

    public AuthResponse refresh(RefreshTokenRequest request) {
        if (request == null
                || request.refreshToken() == null
                || request.refreshToken().isBlank()) {
            throw new UnauthorizedException(
                    "Refresh token is invalid or expired"
            );
        }

        String tokenHash =
                jwtService.hashRefreshToken(request.refreshToken());

        RefreshTokenRefreshResult result =
                refreshTokenRotationService.consume(tokenHash);

        if (result.tokenExpired()) {
            throw new UnauthorizedException(
                    "Refresh token is invalid or expired"
            );
        }

        // The rotation result contains scalar values, not a lazy User proxy.
        String accessToken = jwtService.generateAccessToken(
                result.userId(),
                result.email()
        );

        String rawRefreshToken = jwtService.generateRefreshToken();

        // Reload the user inside a transaction when saving the new token.
        return createRefreshedAuthResponse(
                result.userId(),
                result.email(),
                result.displayName(),
                accessToken,
                rawRefreshToken
        );
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }

        String tokenHash = jwtService.hashRefreshToken(rawToken);

        refreshTokenRepository.findByTokenHashForUpdate(tokenHash)
                .ifPresent(refreshTokenRepository::delete);
    }

    private AuthResponse createAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(
                user.getId(),
                user.getEmail()
        );

        String rawRefreshToken = jwtService.generateRefreshToken();

        RefreshToken storedToken = RefreshToken.builder()
                .user(user)
                .tokenHash(
                        jwtService.hashRefreshToken(rawRefreshToken)
                )
                .expiresAt(jwtService.refreshTokenExpiry())
                .build();

        refreshTokenRepository.save(storedToken);

        UserResponse userResponse = new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName()
        );

        return new AuthResponse(
                accessToken,
                rawRefreshToken,
                userResponse
        );
    }

    @Transactional
    protected AuthResponse createRefreshedAuthResponse(
            java.util.UUID userId,
            String email,
            String displayName,
            String accessToken,
            String rawRefreshToken
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException(
                        "User account is unavailable"
                ));

        RefreshToken storedToken = RefreshToken.builder()
                .user(user)
                .tokenHash(
                        jwtService.hashRefreshToken(rawRefreshToken)
                )
                .expiresAt(jwtService.refreshTokenExpiry())
                .build();

        refreshTokenRepository.save(storedToken);

        UserResponse userResponse = new UserResponse(
                userId,
                email,
                displayName
        );

        return new AuthResponse(
                accessToken,
                rawRefreshToken,
                userResponse
        );
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }
}
