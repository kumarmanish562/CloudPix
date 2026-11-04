
package com.CoudPix.CloudPix_backend.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "app.jwt")
@Validated
public record JwtProperties(

        @NotBlank(message = "JWT secret must be configured")
        String secret,

        @Positive(message = "JWT access expiration must be positive")
        long accessExpirationMs,

        @Positive(message = "JWT refresh expiration must be positive")
        long refreshExpirationMs

) {
}
