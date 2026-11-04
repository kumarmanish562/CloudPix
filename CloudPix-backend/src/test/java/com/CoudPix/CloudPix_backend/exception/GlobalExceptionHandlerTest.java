
package com.CoudPix.CloudPix_backend.exception;

import jakarta.servlet.http.HttpServletRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.BadCredentialsException;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();

        MockHttpServletRequest mockRequest =
                new MockHttpServletRequest();

        mockRequest.setMethod("POST");
        mockRequest.setRequestURI("/api/auth/login");

        request = mockRequest;
    }

    @Test
    void badCredentialsShouldReturn401() {
        ResponseEntity<GlobalExceptionHandler.ApiError> response =
                handler.handleBadCredentials(
                        new BadCredentialsException("internal detail"),
                        request
                );

        assertEquals(
                HttpStatus.UNAUTHORIZED,
                response.getStatusCode()
        );

        GlobalExceptionHandler.ApiError body =
                response.getBody();

        assertNotNull(body);
        assertEquals(401, body.status());
        assertEquals("Invalid email or password", body.message());
        assertFalse(body.toString().contains("internal detail"));
    }

    @Test
    void resourceConflictShouldReturn409() {
        ResponseEntity<GlobalExceptionHandler.ApiError> response =
                handler.handleConflict(
                        new ResourceConflictException(
                                "Email is already registered"
                        ),
                        request
                );

        assertEquals(
                HttpStatus.CONFLICT,
                response.getStatusCode()
        );

        GlobalExceptionHandler.ApiError body =
                response.getBody();

        assertNotNull(body);
        assertEquals(409, body.status());
        assertEquals(
                "Email is already registered",
                body.message()
        );
    }

    @Test
    void unexpectedExceptionShouldNotExposeDetails() {
        ResponseEntity<GlobalExceptionHandler.ApiError> response =
                handler.handleUnexpected(
                        new RuntimeException(
                                "database-password-secret"
                        ),
                        request
                );

        assertEquals(
                HttpStatus.INTERNAL_SERVER_ERROR,
                response.getStatusCode()
        );

        GlobalExceptionHandler.ApiError body =
                response.getBody();

        assertNotNull(body);
        assertEquals(
                "An unexpected server error occurred",
                body.message()
        );
        assertFalse(
                body.toString().contains("database-password-secret")
        );
    }

    @Test
    void errorResponseShouldContainStandardFields() {
        ResponseEntity<GlobalExceptionHandler.ApiError> response =
                handler.handleBadCredentials(
                        new BadCredentialsException("invalid"),
                        request
                );

        GlobalExceptionHandler.ApiError body =
                response.getBody();

        assertNotNull(body);
        assertNotNull(body.timestamp());
        assertEquals(401, body.status());
        assertNotNull(body.error());
        assertNotNull(body.message());
        assertEquals("/api/auth/login", body.path());
    }
}
