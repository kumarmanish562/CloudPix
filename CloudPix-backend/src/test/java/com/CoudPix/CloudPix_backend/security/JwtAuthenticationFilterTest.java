
package com.CoudPix.CloudPix_backend.security;

import com.CoudPix.CloudPix_backend.config.JwtProperties;
import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.services.JwtService;
import com.CoudPix.CloudPix_backend.services.UserService;
import com.CoudPix.CloudPix_backend.services.impl.UserDetailsServiceImpl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {

    private static final String SECRET =
            "0123456789abcdef0123456789abcdef";

    private JwtService jwtService;
    private UserDetailsServiceImpl userDetailsService;
    private UserService userService;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        jwtService = new JwtService(
                new JwtProperties(
                        SECRET,
                        900_000L,
                        604_800_000L
                )
        );

        userDetailsService =
                mock(UserDetailsServiceImpl.class);

        userService = mock(UserService.class);

        filter = new JwtAuthenticationFilter(
                jwtService,
                userDetailsService,
                userService
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldNotAuthenticateInvalidToken() throws Exception {
        MockHttpServletRequest request =
                new MockHttpServletRequest();

        request.addHeader(
                "Authorization",
                "Bearer invalid-token"
        );

        MockHttpServletResponse response =
                new MockHttpServletResponse();

        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(
                SecurityContextHolder.getContext()
                        .getAuthentication()
        );

        verifyNoInteractions(userService);
        verifyNoInteractions(userDetailsService);
    }

    @Test
    void shouldAuthenticateValidAccessToken() throws Exception {
        UUID userId = UUID.randomUUID();
        String email = "test@example.com";

        String token =
                jwtService.generateAccessToken(userId, email);

        UserDetails userDetails =
                org.springframework.security.core.userdetails.User
                        .withUsername(email)
                        .password("not-used")
                        .authorities("ROLE_USER")
                        .build();

        when(userService.findEmailById(userId))
                .thenReturn(Optional.of(email));

        when(userDetailsService.loadUserByUsername(email))
                .thenReturn(userDetails);

        MockHttpServletRequest request =
                new MockHttpServletRequest();

        request.addHeader(
                "Authorization",
                "Bearer " + token
        );

        MockHttpServletResponse response =
                new MockHttpServletResponse();

        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNotNull(
                SecurityContextHolder.getContext()
                        .getAuthentication()
        );

        assertEquals(
                email,
                SecurityContextHolder.getContext()
                        .getAuthentication()
                        .getName()
        );

        verify(userService).findEmailById(userId);
        verify(userDetailsService).loadUserByUsername(email);
    }

    @Test
    void shouldContinueWithoutToken() throws Exception {
        MockHttpServletRequest request =
                new MockHttpServletRequest();

        MockHttpServletResponse response =
                new MockHttpServletResponse();

        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(
                SecurityContextHolder.getContext()
                        .getAuthentication()
        );

        verifyNoInteractions(userService);
        verifyNoInteractions(userDetailsService);
    }
}
