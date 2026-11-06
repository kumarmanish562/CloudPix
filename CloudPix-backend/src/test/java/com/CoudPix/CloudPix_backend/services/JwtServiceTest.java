
package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.config.JwtProperties;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String SECRET =
            "0123456789abcdef0123456789abcdef";

    private JwtService jwtService;
    private SecretKey key;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties(
                SECRET,
                900_000L,
                604_800_000L
        );

        jwtService = new JwtService(properties);

        key = Keys.hmacShaKeyFor(
                SECRET.getBytes(StandardCharsets.UTF_8)
        );
    }

    @Test
    void shouldAcceptValidAccessToken() {
        UUID userId = UUID.randomUUID();
        String email = "test@example.com";

        String token =
                jwtService.generateAccessToken(userId, email);

        assertTrue(jwtService.isTokenValid(token));
        assertEquals(userId, jwtService.extractUserId(token));
    }

    @Test
    void shouldRejectExpiredToken() {
        String token = createToken(
                UUID.randomUUID().toString(),
                "access",
                Instant.now().minusSeconds(120),
                Instant.now().minusSeconds(60),
                key
        );

        assertFalse(jwtService.isTokenValid(token));
    }

    @Test
    void shouldRejectWrongTokenType() {
        String token = createToken(
                UUID.randomUUID().toString(),
                "refresh",
                Instant.now().minusSeconds(10),
                Instant.now().plusSeconds(60),
                key
        );

        assertFalse(jwtService.isTokenValid(token));
    }

    @Test
    void shouldRejectInvalidSignature() {
        SecretKey differentKey = Keys.hmacShaKeyFor(
                "abcdef0123456789abcdef0123456789"
                        .getBytes(StandardCharsets.UTF_8)
        );

        String token = createToken(
                UUID.randomUUID().toString(),
                "access",
                Instant.now().minusSeconds(10),
                Instant.now().plusSeconds(60),
                differentKey
        );

        assertFalse(jwtService.isTokenValid(token));
    }

    @Test
    void shouldRejectMalformedSubject() {
        String token = createToken(
                "not-a-uuid",
                "access",
                Instant.now().minusSeconds(10),
                Instant.now().plusSeconds(60),
                key
        );

        assertFalse(jwtService.isTokenValid(token));
    }

    @Test
    void shouldRejectTokenWithoutExpiration() {
        String token = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .claim("type", "access")
                .issuedAt(
                        Date.from(Instant.now().minusSeconds(10))
                )
                .signWith(key)
                .compact();

        assertFalse(jwtService.isTokenValid(token));
    }

    @Test
    void shouldRejectBlankToken() {
        assertFalse(jwtService.isTokenValid(null));
        assertFalse(jwtService.isTokenValid(""));
        assertFalse(jwtService.isTokenValid("   "));
    }

    @Test
    void shouldRejectTokenIssuedInFuture() {
        Instant now = Instant.now();

        String token = createToken(
                UUID.randomUUID().toString(),
                "access",
                now.plusSeconds(300),
                now.plusSeconds(600),
                key
        );

        assertFalse(jwtService.isTokenValid(token));
    }

    @Test
    void shouldHashRefreshTokenDeterministically() {
        String token = jwtService.generateRefreshToken();

        String firstHash =
                jwtService.hashRefreshToken(token);

        String secondHash =
                jwtService.hashRefreshToken(token);

        assertEquals(firstHash, secondHash);
        assertEquals(64, firstHash.length());
        assertNotEquals(token, firstHash);
    }

    @Test
    void shouldProduceDifferentHashesForDifferentTokens() {
        String firstHash =
                jwtService.hashRefreshToken("refresh-token-one");

        String secondHash =
                jwtService.hashRefreshToken("refresh-token-two");

        assertNotEquals(firstHash, secondHash);
    }

    @Test
    void shouldRejectBlankRefreshTokenForHashing() {
        assertThrows(
                IllegalArgumentException.class,
                () -> jwtService.hashRefreshToken("")
        );

        assertThrows(
                IllegalArgumentException.class,
                () -> jwtService.hashRefreshToken("   ")
        );
    }

    private String createToken(
            String subject,
            String type,
            Instant issuedAt,
            Instant expiration,
            SecretKey signingKey
    ) {
        return Jwts.builder()
                .subject(subject)
                .claim("type", type)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiration))
                .signWith(signingKey)
                .compact();
    }

    @Test
    void rejectsMissingSubjectsAndIssuedAtClaims() {
        assertFalse(jwtService.isTokenValid(Jwts.builder().claim("type", "access")
                .issuedAt(Date.from(Instant.now().minusSeconds(10))).expiration(Date.from(Instant.now().plusSeconds(60)))
                .signWith(key).compact()));
        assertFalse(jwtService.isTokenValid(Jwts.builder().subject(UUID.randomUUID().toString()).claim("type", "access")
                .expiration(Date.from(Instant.now().plusSeconds(60))).signWith(key).compact()));
    }

    @Test
    void refusesWrongTokenTypesDuringIdentityExtraction() {
        String token = createToken(UUID.randomUUID().toString(), "refresh", Instant.now().minusSeconds(10), Instant.now().plusSeconds(60), key);
        assertThrows(IllegalArgumentException.class, () -> jwtService.extractUserId(token));
        assertThrows(IllegalArgumentException.class, () -> jwtService.extractUserId(null));
        assertThrows(IllegalArgumentException.class, () -> jwtService.extractUserId(" "));
        assertThrows(IllegalArgumentException.class, () -> jwtService.hashRefreshToken(null));
    }

    @Test
    void refusesUnconfiguredOrWeakSigningKeys() {
        for (String secret : new String[] { null, "", " ", "too-short" }) {
            assertThrows(IllegalStateException.class, () -> new JwtService(new JwtProperties(secret, 60_000, 60_000)));
        }
    }

    @Test
    void refreshExpiryUsesTheConfiguredDuration() {
        Instant before = Instant.now();
        Instant expiry = jwtService.refreshTokenExpiry();
        Instant after = Instant.now();
        assertFalse(expiry.isBefore(before.plusMillis(604_800_000)));
        assertFalse(expiry.isAfter(after.plusMillis(604_800_000)));
    }

    @Test
    void refreshTokensAreUniqueAndNotAccessJwts() {
        String first = jwtService.generateRefreshToken();
        String second = jwtService.generateRefreshToken();
        assertNotEquals(first, second);
        assertFalse(jwtService.isTokenValid(first));
        assertEquals(2, first.split("\\.").length);
    }

}
