package com.CoudPix.CloudPix_backend.controllers;

import com.CoudPix.CloudPix_backend.services.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class DownloadController {
    private final PhotoDownloadService downloads;
    private final UserService users;
    public DownloadController(PhotoDownloadService downloads, UserService users) { this.downloads = downloads; this.users = users; }

    @GetMapping("/photos/{id}/download")
    public ResponseEntity<InputStreamResource> photo(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID id) {
        return downloads.photo(users.getByEmail(principal.getUsername()), id);
    }

    @GetMapping("/albums/{id}/download")
    public ResponseEntity<InputStreamResource> album(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID id) {
        return downloads.album(users.getByEmail(principal.getUsername()), id);
    }
}

