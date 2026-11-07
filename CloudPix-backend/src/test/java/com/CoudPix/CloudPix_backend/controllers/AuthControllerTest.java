package com.CoudPix.CloudPix_backend.controllers;

import com.CoudPix.CloudPix_backend.dto.ResendVerificationRequest;
import com.CoudPix.CloudPix_backend.dto.UserResponse;
import com.CoudPix.CloudPix_backend.dto.VerifyEmailRequest;
import com.CoudPix.CloudPix_backend.services.*;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    @Test
    void profileWithoutAPrincipalIsRejectedBeforeReadingUserData() {
        var service = mock(UserService.class);
        var emailVerification = mock(EmailVerificationService.class);
        var controller = new AuthController(mock(AuthService.class), service, emailVerification);
        assertEquals(401, controller.me(null).getStatusCode().value());
        verifyNoInteractions(service);
    }

    @Test
    void verifyEmailDelegatesToService() {
        var emailVerification = mock(EmailVerificationService.class);
        var controller = new AuthController(mock(AuthService.class), mock(UserService.class), emailVerification);
        var request = new VerifyEmailRequest("token123", null, null);
        var userResponse = new UserResponse(UUID.randomUUID(), "test@example.com", "Test", true);
        when(emailVerification.verifyEmail(request)).thenReturn(userResponse);

        var response = controller.verifyEmail(request);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("test@example.com", response.getBody().email());
        assertTrue(response.getBody().emailVerified());
        verify(emailVerification).verifyEmail(request);
    }

    @Test
    void resendVerificationDelegatesToService() {
        var emailVerification = mock(EmailVerificationService.class);
        var controller = new AuthController(mock(AuthService.class), mock(UserService.class), emailVerification);
        var request = new ResendVerificationRequest("test@example.com");

        var response = controller.resendVerification(request);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("Verification email sent successfully", response.getBody().get("message"));
        verify(emailVerification).resendVerification("test@example.com");
    }
}
