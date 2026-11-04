package com.CoudPix.CloudPix_backend.dto;
import java.time.Instant;
import java.util.UUID;
// The raw token is returned only on creation.
public record ShareResponse(UUID id, String token, Instant expiresAt, Instant createdAt, boolean revoked) {}

