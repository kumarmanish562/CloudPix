package com.CoudPix.CloudPix_backend.controllers;

import java.util.List;

import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.ImageKitAssetResponse;
import com.CoudPix.CloudPix_backend.dto.ImportPhotosRequest;
import com.CoudPix.CloudPix_backend.dto.PhotoResponse;
import com.CoudPix.CloudPix_backend.dto.StorageUsageResponse;
import com.CoudPix.CloudPix_backend.services.LibraryService;
import com.CoudPix.CloudPix_backend.services.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;


@RestController
@RequestMapping("/api/library")
public class LibraryController {

    private final LibraryService libraryService;
    private final UserService userService;

    public LibraryController(LibraryService libraryService, UserService userService) {
        this.libraryService = libraryService;
        this.userService = userService;
    }

    @GetMapping("/storage")
    public ResponseEntity<StorageUsageResponse> getStorageUsage(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        return ResponseEntity.ok(libraryService.getStorageUsage(user));
    }

    @GetMapping("/imagekit-assets")
    public ResponseEntity<List<ImageKitAssetResponse>> listImageKitAssets(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        return ResponseEntity.ok(libraryService.listImportableAssets(user));
    }

    @PostMapping("/import")
    public ResponseEntity<List<PhotoResponse>> importAssets(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ImportPhotosRequest request
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        return ResponseEntity.ok(libraryService.importAssets(user, request));
    }
}
