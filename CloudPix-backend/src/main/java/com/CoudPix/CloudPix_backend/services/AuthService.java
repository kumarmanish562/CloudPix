
package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.RefreshToken;
import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.AuthResponse;
import com.CoudPix.CloudPix_backend.dto.LoginRequest;
import com.CoudPix.CloudPix_backend.dto.RegisterRequest;
import com.CoudPix.CloudPix_backend.exception.ResourceConflictException;
import com.CoudPix.CloudPix_backend.repositories.RefreshTokenRepository;
import com.CoudPix.CloudPix_backend.repositories.UserRepository;

import jakarta.transaction.Transactional;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            UserService userService,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(email)) {
            throw new ResourceConflictException(
                    "Email is already registered"
            );
        }

        User user = User.builder()
                .email(email)
                .passwordHash(
                        passwordEncoder.encode(request.password())
                )
                .displayName(request.displayName().trim())
                .build();

        user = userRepository.save(user);

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        Authentication authentication =
                authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                                email,
                                request.password()
                        )
                );

        UserDetails userDetails =
                (UserDetails) authentication.getPrincipal();

        User user = userRepository.findByEmail(
                        userDetails.getUsername()
                )
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Authenticated user was not found"
                        )
                );

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(String refreshTokenValue) {

        if (refreshTokenValue == null
                || refreshTokenValue.isBlank()) {
            throw new IllegalArgumentException(
                    "Refresh token is required"
            );
        }

        RefreshToken refreshToken =
                refreshTokenRepository.findByToken(
                        refreshTokenValue
                ).orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invalid refresh token"
                        )
                );

        // Assumes RefreshToken.expiresAt is of type Instant.
        Instant now = Instant.now();

        if (refreshToken.getExpiresAt() == null
                || !refreshToken.getExpiresAt().isAfter(now)) {

            refreshTokenRepository.delete(refreshToken);

            throw new IllegalArgumentException(
                    "Refresh token has expired"
            );
        }

        User user = refreshToken.getUser();

        // Revoke the old token before issuing a replacement.
        refreshTokenRepository.delete(refreshToken);

        return buildAuthResponse(user);
    }

    @Transactional
    public void logout(String refreshTokenValue) {

        if (refreshTokenValue == null
                || refreshTokenValue.isBlank()) {
            return;
        }

        refreshTokenRepository.findByToken(refreshTokenValue)
                .ifPresent(refreshTokenRepository::delete);
    }

    private AuthResponse buildAuthResponse(User user) {

        String accessToken =
                jwtService.generateAccessToken(user);

        String refreshTokenValue =
                jwtService.generateRefreshTokenValue();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenValue)
                .expiresAt(jwtService.refreshTokenExpiry())
                .build();

        refreshTokenRepository.save(refreshToken);

        return new AuthResponse(
                accessToken,
                refreshTokenValue,
                userService.toUserResponse(user)
        );
    }
}
