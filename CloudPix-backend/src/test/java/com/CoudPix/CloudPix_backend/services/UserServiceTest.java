package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.exception.UnauthorizedException;
import com.CoudPix.CloudPix_backend.repositories.UserRepository;
import com.CoudPix.CloudPix_backend.services.impl.UserDetailsServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest {
    private final UserRepository repository = mock(UserRepository.class);
    private final UserService users = new UserService(repository);
    private final UserDetailsServiceImpl details = new UserDetailsServiceImpl(repository);
    private final User user = User.builder().id(UUID.randomUUID()).email("i@example.com")
            .displayName("Owner").passwordHash("stored-password-hash").build();

    @Test
    void mapsThePublicProfileWithoutExposingThePasswordHash() {
        when(repository.findByEmail("i@example.com")).thenReturn(Optional.of(user));
        var profile = users.getUserResponseByEmail("I@EXAMPLE.COM");
        assertEquals(user.getId(), profile.id());
        assertEquals("Owner", profile.displayName());
        assertFalse(profile.toString().contains("stored-password-hash"));
    }

    @Test
    void unknownUserIsUnauthorized() {
        assertThrows(UnauthorizedException.class, () -> users.getByEmail("missing@example.com"));
    }

    @Test
    void findsEmailAndExistenceById() {
        when(repository.findById(user.getId())).thenReturn(Optional.of(user));
        when(repository.existsById(user.getId())).thenReturn(true);
        assertEquals(Optional.of(user.getEmail()), users.findEmailById(user.getId()));
        assertTrue(users.existsById(user.getId()));
        assertEquals(Optional.empty(), users.findEmailById(UUID.randomUUID()));
        assertFalse(users.existsById(UUID.randomUUID()));
    }

    @Test
    void authenticationLoadsTheStoredHashAndUserRole() {
        when(repository.findByEmail("i@example.com")).thenReturn(Optional.of(user));
        var loaded = details.loadUserByUsername("I@EXAMPLE.COM");
        assertEquals(user.getEmail(), loaded.getUsername());
        assertEquals(user.getPasswordHash(), loaded.getPassword());
        assertTrue(loaded.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_USER")));
    }

    @Test
    void authenticationRejectsUnknownAccounts() {
        assertThrows(UsernameNotFoundException.class, () -> details.loadUserByUsername("missing@example.com"));
    }

    @Test
    void emailLookupIsIndependentOfServerLocale() {
        Locale previous = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            when(repository.findByEmail("i@example.com")).thenReturn(Optional.of(user));
            assertEquals(user.getId(), users.getByEmail("I@EXAMPLE.COM").getId());
            assertEquals(user.getEmail(), details.loadUserByUsername("I@EXAMPLE.COM").getUsername());
        } finally { Locale.setDefault(previous); }
    }
}

