package com.CoudPix.CloudPix_backend.dto;


import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(
        @NotBlank String refreshToken) {

}