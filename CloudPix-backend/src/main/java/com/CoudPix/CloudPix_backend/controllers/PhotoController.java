package com.CoudPix.CloudPix_backend.controllers;

import java.util.UUID;

import com.CoudPix.CloudPix_backend.domain.*;
import com.CoudPix.CloudPix_backend.dto.*;
import com.CoudPix.CloudPix_backend.services.PhotoService;
import com.CoudPix.CloudPix_backend.services.UserService;
import com.CoudPix.CloudPix_backend.services.PhotoDiscoveryService;
import com.CoudPix.CloudPix_backend.services.LibraryService;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;


@RestController
@RequestMapping("/api")
public class PhotoController {
    private final PhotoService photoService;
    private final UserService userService;
    private final PhotoDiscoveryService discovery;
    private final LibraryService library;

    public PhotoController(PhotoService photoService, UserService userService, PhotoDiscoveryService discovery, LibraryService library) {
        this.photoService = photoService;
        this.userService = userService;
        this.discovery = discovery;
        this.library = library;
    }

    @GetMapping("/photos/{id}")
    public ResponseEntity<PhotoResponse> getPhoto(
            @AuthenticationPrincipal  UserDetails userDetails,
            @PathVariable UUID id
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        return ResponseEntity.ok(photoService.getPhoto(user, id));
    }


    @GetMapping("/photos")
    public ResponseEntity<PageResponse<PhotoResponse>> listPhotos(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "ACTIVE") PhotoStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String tag,
            @RequestParam(required = false) Boolean favorite,
            @RequestParam(required = false) String mimeType,
            @RequestParam(required = false) java.time.Instant from,
            @RequestParam(required = false) java.time.Instant to,
            @RequestParam(defaultValue = "newest") String sort
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        PageResponse<PhotoResponse> photos = discovery.search(user, status, q, tag, favorite, mimeType,
                from, to, PhotoDiscoveryService.page(page, size, sort));
        return ResponseEntity.ok(photos);
    }

    @PostMapping(value = "/photos/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PhotoResponse> uploadPhoto(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("file") MultipartFile file,
            @RequestParam(defaultValue = "false") boolean allowDuplicate
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        PhotoResponse photo = photoService.uploadPhoto(user, file, allowDuplicate);
        return ResponseEntity.status(HttpStatus.CREATED).body(photo);
    }

    @PostMapping("/photos")
    public ResponseEntity<PhotoResponse> importPhoto(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreatePhotoRequest request
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        var imported = library.importAssets(user, new ImportPhotosRequest(java.util.List.of(request.imagekitFileId())));
        if (imported.isEmpty()) throw new com.CoudPix.CloudPix_backend.exception.ResourceConflictException("Photo already exists in your library");
        PhotoResponse photo = imported.getFirst();
        return ResponseEntity.status(HttpStatus.CREATED).body(photo);
    }

    @PatchMapping("/photos/{id}")
    public PhotoResponse updatePhoto(@AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id, @Valid @RequestBody UpdatePhotoRequest request) {
        return discovery.update(userService.getByEmail(principal.getUsername()), id, request);
    }

    @GetMapping("/photos/tags")
    public java.util.List<String> tags(@AuthenticationPrincipal UserDetails principal) {
        return discovery.tags(userService.getByEmail(principal.getUsername()));
    }

    @GetMapping("/photos/duplicates")
    public PageResponse<PhotoResponse> duplicates(@AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "24") int size) {
        PhotoDiscoveryService.page(page, size, "newest");
        return discovery.duplicates(userService.getByEmail(principal.getUsername()),
                PageRequest.of(page, size, Sort.by("contentHash").and(Sort.by("createdAt")).and(Sort.by("id"))));
    }

    @GetMapping("/photos/memories")
    public PageResponse<PhotoResponse> memories(@AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false) java.time.LocalDate date,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "24") int size) {
        return discovery.memories(userService.getByEmail(principal.getUsername()),
                date == null ? java.time.LocalDate.now(java.time.ZoneOffset.UTC) : date,
                PhotoDiscoveryService.page(page, size, "newest"));
    }

    @PostMapping("/photos/archive")
    public ResponseEntity<Void> archivePhotos(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BulkPhotoActionRequest request
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        photoService.archivePhotos(user, request.photoIds());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/photos/trash")
    public ResponseEntity<Void> trashPhotos(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BulkPhotoActionRequest request
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        photoService.movePhotosToTrash(user, request.photoIds());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/photos/restore")
    public ResponseEntity<Void> restorePhotos(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BulkPhotoActionRequest request
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        photoService.restorePhotos(user, request.photoIds());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/photos/delete-permanent")
    public ResponseEntity<Void> permanentlyDeletePhotos(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BulkPhotoActionRequest request
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        photoService.permanentlyDeletePhotos(user, request.photoIds());
        return ResponseEntity.noContent().build();
    }



    @DeleteMapping("/photos/{id}")
    public ResponseEntity<Void> deletePhoto(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        photoService.permanentlyDeletePhoto(user, id);
        return ResponseEntity.noContent().build();
    }


}
