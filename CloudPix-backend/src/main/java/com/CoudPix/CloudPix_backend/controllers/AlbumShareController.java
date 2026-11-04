package com.CoudPix.CloudPix_backend.controllers;

import com.CoudPix.CloudPix_backend.dto.*;
import com.CoudPix.CloudPix_backend.services.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.http.*;
import jakarta.validation.Valid;
import java.util.*;

@RestController
@RequestMapping("/api")
public class AlbumShareController {
    private final AlbumShareService shares;
    private final UserService users;
    private final ImageDownloadClient images;
    public AlbumShareController(AlbumShareService shares, UserService users, ImageDownloadClient images) {
        this.shares = shares; this.users = users; this.images = images;
    }

    @PostMapping("/albums/{id}/shares")
    @ResponseStatus(HttpStatus.CREATED)
    public ShareResponse create(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID id,
            @Valid @RequestBody CreateShareRequest request) {
        return shares.create(users.getByEmail(principal.getUsername()), id, request.expiresInHours());
    }

    @GetMapping("/albums/{id}/shares")
    public List<ShareResponse> list(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID id) {
        return shares.list(users.getByEmail(principal.getUsername()), id);
    }

    @DeleteMapping("/albums/{id}/shares/{shareId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID id, @PathVariable UUID shareId) {
        shares.revoke(users.getByEmail(principal.getUsername()), id, shareId);
    }

    @GetMapping("/shared/{token}")
    public ResponseEntity<SharedAlbumResponse> shared(@PathVariable String token,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "24") int size) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header("Referrer-Policy", "no-referrer").header("X-Robots-Tag", "noindex, nofollow")
                .body(shares.get(token, PhotoDiscoveryService.albumPage(page, size)));
    }

    @GetMapping("/shared/{token}/photos/{photoId}")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> image(@PathVariable String token,
            @PathVariable UUID photoId, @RequestParam(defaultValue = "false") boolean thumbnail) {
        var image = shares.image(token, photoId, thumbnail);
        String mime = image.mimeType();
        MediaType type = mime != null && java.util.Set.of("image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif").contains(mime)
                ? MediaType.parseMediaType(mime) : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(type)
                .header("Referrer-Policy", "no-referrer")
                .body(new org.springframework.core.io.InputStreamResource(images.open(image.url())));
    }
}

