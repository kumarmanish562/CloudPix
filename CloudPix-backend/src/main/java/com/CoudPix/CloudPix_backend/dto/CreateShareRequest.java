package com.CoudPix.CloudPix_backend.dto;
import jakarta.validation.constraints.*;
public record CreateShareRequest(@Min(1) @Max(720) int expiresInHours) {}

