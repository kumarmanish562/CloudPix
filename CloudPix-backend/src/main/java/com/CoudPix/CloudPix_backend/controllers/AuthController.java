package com.CoudPix.CloudPix_backend.controllers;

import com.CoudPix.CloudPix_backend.dto.AuthResponse;
import com.CoudPix.CloudPix_backend.dto.LoginRequest;
import com.CoudPix.CloudPix_backend.dto.RefreshTokenRequest;
import com.CoudPix.CloudPix_backend.dto.RegisterRequest;
import com.CoudPix.CloudPix_backend.dto.ResendVerificationRequest;
import com.CoudPix.CloudPix_backend.dto.UserResponse;
import com.CoudPix.CloudPix_backend.dto.VerifyEmailRequest;
import com.CoudPix.CloudPix_backend.services.AuthService;
import com.CoudPix.CloudPix_backend.services.EmailVerificationService;
import com.CoudPix.CloudPix_backend.services.UserService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final EmailVerificationService emailVerificationService;

    public AuthController(
            AuthService authService,
            UserService userService,
            EmailVerificationService emailVerificationService
    ) {
        this.authService = authService;
        this.userService = userService;
        this.emailVerificationService = emailVerificationService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        AuthResponse response = authService.register(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        AuthResponse response = authService.login(request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        AuthResponse response = authService.refresh(request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestBody(required = false)
            RefreshTokenRequest request
    ) {
        if (request != null && request.refreshToken() != null) {
            authService.logout(request.refreshToken());
        }

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<UserResponse> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request
    ) {
        UserResponse response = emailVerificationService.verifyEmail(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request
    ) {
        emailVerificationService.resendVerification(request.email());
        return ResponseEntity.ok(Map.of("message", "Verification email sent successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .build();
        }

        UserResponse response =
                userService.getUserResponseByEmail(
                        userDetails.getUsername()
                );

        return ResponseEntity.ok(response);
    }
}
