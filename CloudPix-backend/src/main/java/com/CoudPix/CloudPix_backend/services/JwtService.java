package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.config.JwtProperties;
import com.CoudPix.CloudPix_backend.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;


import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final JwtProperties jwtProperties;
    private final SecretKey secretKey;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        this.secretKey = buildKey(jwtProperties.secret());
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(jwtProperties.accessExpirationMs());

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("type", "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(secretKey)
                .compact();
    }

    public String generateRefreshTokenValue() {
        return UUID.randomUUID().toString() + "." + UUID.randomUUID();
    }

    public Instant refreshTokenExpiry() {
        return Instant.now().plusMillis(jwtProperties.refreshExpirationMs());
    }

    public UUID extractUserId(String token) {
        Claims claims = parseClaims(token);
        return UUID.fromString(claims.getSubject());
    }


    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseClaims(token);

            if (claims.getExpiration() == null
                    || !claims.getExpiration().after(new Date())) {
                System.err.println("JWT rejected: expired or missing expiration");
                return false;
            }

            if (!"access".equals(claims.get("type", String.class))) {
                System.err.println("JWT rejected: token type is not access");
                return false;
            }

            return true;
        } catch (io.jsonwebtoken.ExpiredJwtException ex) {
            System.err.println("JWT rejected: expired");
        } catch (io.jsonwebtoken.security.SignatureException ex) {
            System.err.println("JWT rejected: signature verification failed");
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException ex) {
            System.err.println("JWT rejected: malformed or invalid token");
        }

        return false;
    }


    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey buildKey(String secret) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            try {
                keyBytes = MessageDigest.getInstance("SHA-256").digest(keyBytes);
            } catch (NoSuchAlgorithmException ex) {
                throw new IllegalStateException("SHA-256 not available", ex);
            }
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
