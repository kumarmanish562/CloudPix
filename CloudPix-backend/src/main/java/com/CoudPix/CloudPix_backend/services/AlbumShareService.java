package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.*;
import com.CoudPix.CloudPix_backend.dto.*;
import com.CoudPix.CloudPix_backend.exception.*;
import com.CoudPix.CloudPix_backend.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Pageable;
import java.time.Instant;
import java.security.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class AlbumShareService {
    private final AlbumRepository albums;
    private final AlbumShareRepository shares;
    private final AlbumPhotoRepository albumPhotos;
    private final SecureRandom random = new SecureRandom();

    public AlbumShareService(AlbumRepository albums, AlbumShareRepository shares, AlbumPhotoRepository albumPhotos) {
        this.albums = albums; this.shares = shares; this.albumPhotos = albumPhotos;
    }

    @Transactional
    public ShareResponse create(User user, UUID albumId, int hours) {
        Album album = owned(user, albumId);
        if (hours < 1 || hours > 720) throw new BadRequestException("Share expiry must be between 1 and 720 hours");
        var existing = shares.findByAlbumIdOrderByCreatedAtDesc(albumId);
        if (existing.stream().filter(s -> !s.isRevoked() && s.getExpiresAt().isAfter(Instant.now())).count() >= 20)
            throw new BadRequestException("Revoke an existing share before creating another (maximum 20 active links)");
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = Instant.now();
        AlbumShare share = shares.save(AlbumShare.builder().album(album).tokenHash(hash(token))
                .createdAt(now).expiresAt(now.plusSeconds(hours * 3600L)).build());
        return response(share, token);
    }

    public List<ShareResponse> list(User user, UUID albumId) {
        owned(user, albumId);
        return shares.findByAlbumIdOrderByCreatedAtDesc(albumId).stream().map(s -> response(s, null)).toList();
    }

    @Transactional
    public void revoke(User user, UUID albumId, UUID shareId) {
        owned(user, albumId);
        AlbumShare share = shares.findById(shareId).filter(s -> s.getAlbum().getId().equals(albumId))
                .orElseThrow(() -> new ResourceNotFoundException("Share not found"));
        share.setRevoked(true);
    }

    public SharedAlbumResponse get(String token, Pageable pageable) {
        AlbumShare share = valid(token);
        Album album = share.getAlbum();
        var page = albumPhotos.findByAlbumIdAndUserId(album.getId(), album.getUser().getId(), pageable);
        var content = page.getContent().stream().map(ap -> {
            Photo p = ap.getPhoto();
            String protectedUrl = "/api/shared/" + token + "/photos/" + p.getId();
            return new SharedAlbumResponse.SharedPhoto(p.getId(), p.getFileName(), protectedUrl,
                    protectedUrl + "?thumbnail=true", p.getWidth(), p.getHeight());
        }).toList();
        return new SharedAlbumResponse(album.getTitle(), share.getExpiresAt(),
                new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(),
                        page.getTotalPages(), page.isLast()));
    }

    private Album owned(User user, UUID id) {
        return albums.findByIdAndUserId(id, user.getId()).orElseThrow(() -> new ResourceNotFoundException("Album not found"));
    }

    public SharedImage image(String token, UUID photoId, boolean thumbnail) {
        Album album = valid(token).getAlbum();
        Photo photo = albumPhotos.findByAlbumIdAndPhotoId(album.getId(), photoId)
                .map(AlbumPhoto::getPhoto)
                .filter(p -> p.getStatus() == PhotoStatus.ACTIVE && p.getUser().getId().equals(album.getUser().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Shared photo not found"));
        return new SharedImage(thumbnail && photo.getThumbnailUrl() != null ? photo.getThumbnailUrl() : photo.getUrl(), photo.getMimeType());
    }

    public record SharedImage(String url, String mimeType) {}

    private AlbumShare valid(String token) {
        if (!token.matches("[A-Za-z0-9_-]{43}")) throw new ResourceNotFoundException("Share link is unavailable or expired");
        return shares.findByTokenHash(hash(token))
                .filter(s -> !s.isRevoked() && s.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new ResourceNotFoundException("Share link is unavailable or expired"));
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }

    private ShareResponse response(AlbumShare s, String token) {
        return new ShareResponse(s.getId(), token, s.getExpiresAt(), s.getCreatedAt(), s.isRevoked());
    }
}

