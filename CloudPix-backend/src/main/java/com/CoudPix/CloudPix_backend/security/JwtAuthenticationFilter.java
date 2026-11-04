
package com.CoudPix.CloudPix_backend.security;

import com.CoudPix.CloudPix_backend.services.JwtService;
import com.CoudPix.CloudPix_backend.services.UserService;
import com.CoudPix.CloudPix_backend.services.impl.UserDetailsServiceImpl;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter
        extends OncePerRequestFilter {

    private static final Logger log =
            LoggerFactory.getLogger(
                    JwtAuthenticationFilter.class
            );

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final UserService userService;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserDetailsServiceImpl userDetailsService,
            UserService userService
    ) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.userService = userService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader =
                request.getHeader("Authorization");

        // No Bearer token: let Spring Security handle the request.
        if (authHeader == null ||
                !authHeader.regionMatches(
                        true, 0, "Bearer ", 0, 7)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7).trim();

        if (token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        if (SecurityContextHolder.getContext()
                .getAuthentication() == null
                && jwtService.isTokenValid(token)) {

            try {
                UUID userId = jwtService.extractUserId(token);

                userService.findEmailById(userId)
                        .ifPresent(email -> {
                            try {
                                UserDetails userDetails =
                                        userDetailsService
                                                .loadUserByUsername(
                                                        email
                                                );

                                UsernamePasswordAuthenticationToken
                                        authentication =
                                        new UsernamePasswordAuthenticationToken(
                                                userDetails,
                                                null,
                                                userDetails.getAuthorities()
                                        );

                                authentication.setDetails(
                                        new WebAuthenticationDetailsSource()
                                                .buildDetails(request)
                                );

                                SecurityContext context =
                                        SecurityContextHolder
                                                .createEmptyContext();

                                context.setAuthentication(
                                        authentication
                                );

                                SecurityContextHolder
                                        .setContext(context);

                            } catch (UsernameNotFoundException ex) {
                                log.debug(
                                        "JWT user no longer exists"
                                );
                            }
                        });

            } catch (IllegalArgumentException ex) {
                // Invalid UUID or malformed token subject.
                log.debug(
                        "JWT authentication rejected an invalid subject"
                );
            }
        }

        filterChain.doFilter(request, response);
    }
}
