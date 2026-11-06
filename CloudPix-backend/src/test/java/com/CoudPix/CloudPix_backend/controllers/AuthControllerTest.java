package com.CoudPix.CloudPix_backend.controllers;

import com.CoudPix.CloudPix_backend.services.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthControllerTest {
    @Test
    void profileWithoutAPrincipalIsRejectedBeforeReadingUserData() {
        var service = mock(UserService.class);
        var controller = new AuthController(mock(AuthService.class), service);
        assertEquals(401, controller.me(null).getStatusCode().value());
        verifyNoInteractions(service);
    }
}

