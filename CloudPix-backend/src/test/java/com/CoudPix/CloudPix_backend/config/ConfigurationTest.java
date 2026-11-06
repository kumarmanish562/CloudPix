package com.CoudPix.CloudPix_backend.config;

import com.CoudPix.CloudPix_backend.services.JwtService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.mock.web.MockHttpServletRequest;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;

class ConfigurationTest {
    static Stream<ImageKitProperties> incompleteMediaConfiguration() {
        return Stream.of(
            new ImageKitProperties(null, "private", "https://ik.imagekit.io/test"),
            new ImageKitProperties(" ", "private", "https://ik.imagekit.io/test"),
            new ImageKitProperties("public", null, "https://ik.imagekit.io/test"),
            new ImageKitProperties("public", " ", "https://ik.imagekit.io/test"),
            new ImageKitProperties("public", "private", null),
            new ImageKitProperties("public", "private", " ")
        );
    }

    @ParameterizedTest @MethodSource("incompleteMediaConfiguration")
    void missingMediaCredentialsFailFast(ImageKitProperties properties) {
        assertFalse(properties.isConfigured());
        assertThrows(IllegalStateException.class, () -> new ImageKitConfig().imageKitClint(properties));
    }

    @Test
    void completeMediaConfigurationIsAccepted() {
        assertTrue(new ImageKitProperties("public", "private", "https://ik.imagekit.io/test").isConfigured());
    }

    @Test
    void corsTrimsAllowedOriginsAndAllowsOnlyTheConfiguredMethodsAndHeaders() {
        var source = new AppConfig().corsConfigurationSource(new CorsProperties(List.of(" http://localhost:3000 ", " ")));
        var cors = source.getCorsConfiguration(new MockHttpServletRequest("OPTIONS", "/api/photos"));
        assertNotNull(cors);
        assertEquals(List.of("http://localhost:3000"), cors.getAllowedOrigins());
        assertTrue(cors.getAllowedMethods().containsAll(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS")));
        assertTrue(cors.getAllowedHeaders().contains("Authorization"));
        assertFalse(cors.getAllowCredentials());
        assertNull(cors.checkOrigin("https://untrusted.example"));
    }

    @Test
    void invalidTokenDurationsAndEmptyCorsListsFailBeanValidation() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertEquals(2, validator.validate(new JwtProperties("valid-secret", 0, -1)).size());
            assertFalse(validator.validate(new CorsProperties(List.of())).isEmpty());
            assertTrue(validator.validate(new CorsProperties(List.of("http://localhost:3000"))).isEmpty());
        }
    }
}

