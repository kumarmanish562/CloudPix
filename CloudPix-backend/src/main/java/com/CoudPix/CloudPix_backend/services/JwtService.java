package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final Logger log =
            LoggerFactory.getLogger(JwtService.class);

    private static final String TOKEN_TYPE = "type";
    private static final String ACCESS_TYPE = "access";

    private final JwtProperties properties;
    private final SecretKey secretKey;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.secretKey = buildKey(properties.secret());
    }

    private SecretKey buildKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET must be configured"
            );
        }

        byte[] keyBytes =
                secret.getBytes(StandardCharsets.UTF_8);

        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "JWT secret must contain at least 32 UTF-8 bytes"
            );
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(
            UUID userId,
            String email
    ) {
        Instant now = Instant.now();

        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim(TOKEN_TYPE, ACCESS_TYPE)
                .issuedAt(Date.from(now))
                .expiration(Date.from(
                        now.plusMillis(
                                properties.accessExpirationMs()
                        )
                ))
                .signWith(secretKey)
                .compact();
    }

    public UUID extractUserId(String token) {
        Claims claims = parseClaims(token);

        if (!ACCESS_TYPE.equals(
                claims.get(TOKEN_TYPE, String.class)
        )) {
            throw new IllegalArgumentException(
                    "Invalid access token"
            );
        }

        return UUID.fromString(claims.getSubject());
    }

    public boolean isTokenValid(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        try {
            Claims claims = parseClaims(token);

            if (!ACCESS_TYPE.equals(
                    claims.get(TOKEN_TYPE, String.class)
            )) {
                return false;
            }

            if (claims.getSubject() == null
                    || claims.getSubject().isBlank()) {
                return false;
            }

            UUID.fromString(claims.getSubject());

            Date issuedAt = claims.getIssuedAt();
            Date expiration = claims.getExpiration();

            if (issuedAt == null || expiration == null) {
                return false;
            }

            if (issuedAt.toInstant().isAfter(Instant.now())) {
                return false;
            }

            return expiration.toInstant().isAfter(Instant.now());

        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("JWT validation failed: {}", ex.getClass().getSimpleName());
            return false;
        }
    }

    private Claims parseClaims(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException(
                    "Token must not be blank"
            );
        }

        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String generateRefreshToken() {
        return UUID.randomUUID() + "." + UUID.randomUUID();
    }

    public Instant refreshTokenExpiry() {
        return Instant.now().plusMillis(
                properties.refreshExpirationMs()
        );
    }

    public String hashRefreshToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException(
                    "Refresh token must not be blank"
            );
        }

        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    rawToken.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(
                    "SHA-256 is unavailable", ex
            );
        }
    }
}