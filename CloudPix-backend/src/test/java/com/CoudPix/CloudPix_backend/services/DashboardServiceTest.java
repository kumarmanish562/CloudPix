package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.Photo;
import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.AiTransformType;
import com.CoudPix.CloudPix_backend.dto.DashboardSummaryResponse;
import com.CoudPix.CloudPix_backend.dto.PhotoStatus;
import com.CoudPix.CloudPix_backend.repositories.AlbumRepository;
import com.CoudPix.CloudPix_backend.repositories.AlbumShareRepository;
import com.CoudPix.CloudPix_backend.repositories.PhotoRepository;
import com.CoudPix.CloudPix_backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DashboardServiceTest {

    private PhotoRepository photoRepository;
    private AlbumRepository albumRepository;
    private AlbumShareRepository albumShareRepository;
    private UserRepository userRepository;
    private DashboardService service;

    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        photoRepository = mock(PhotoRepository.class);
        albumRepository = mock(AlbumRepository.class);
        albumShareRepository = mock(AlbumShareRepository.class);
        userRepository = mock(UserRepository.class);

        service = new DashboardService(photoRepository, albumRepository, albumShareRepository, userRepository);

        userId = UUID.randomUUID();
        testUser = User.builder()
                .id(userId)
                .email("user@example.com")
                .displayName("Tester")
                .emailVerified(true)
                .build();
    }

    @Test
    void getDashboardSummaryAggregatesMetricsCorrectly() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(photoRepository.countByUserIdAndStatus(userId, PhotoStatus.ACTIVE)).thenReturn(42L);
        when(albumRepository.countByUserId(userId)).thenReturn(5L);
        when(photoRepository.countByUserIdAndFavoriteTrueAndStatus(userId, PhotoStatus.ACTIVE)).thenReturn(12L);
        when(photoRepository.countByUserIdAndAiTransformTypeIsNotNullAndStatus(userId, PhotoStatus.ACTIVE)).thenReturn(7L);
        when(photoRepository.sumActivePhotoBytesByUserId(userId)).thenReturn(104857600L); // 100 MB
        when(albumShareRepository.countActiveSharesByUserId(userId)).thenReturn(3L);
        when(photoRepository.findActivePhotosSince(eq(userId), any())).thenReturn(List.of());
        when(photoRepository.countByMimeType(userId)).thenReturn(List.<Object[]>of(
                new Object[]{"image/jpeg", 30L},
                new Object[]{"image/png", 12L}
        ));
        Photo recentPhoto = Photo.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .fileName("portrait.jpg")
                .url("https://ik.imagekit.io/test/portrait.jpg")
                .thumbnailUrl("https://ik.imagekit.io/test/portrait_thumb.jpg")
                .imagekitFileId("file_123")
                .sizeBytes(2048L)
                .status(PhotoStatus.ACTIVE)
                .createdAt(Instant.now())
                .aiTransformType(AiTransformType.RETOUCH)
                .build();
        when(photoRepository.findTop6ByUserIdAndStatusOrderByCreatedAtDesc(userId, PhotoStatus.ACTIVE)).thenReturn(List.of(recentPhoto));

        DashboardSummaryResponse summary = service.getDashboardSummary(userId);

        assertEquals(42L, summary.totalPhotos());
        assertEquals(5L, summary.totalAlbums());
        assertEquals(12L, summary.totalFavorites());
        assertEquals(7L, summary.totalAiTransformed());
        assertEquals(104857600L, summary.storageUsedBytes());
        assertEquals(3L, summary.activeShares());
        assertTrue(summary.emailVerified());
        assertEquals(7, summary.uploadTrends().size());
        assertEquals(2, summary.formatDistribution().size());
        assertEquals("JPEG", summary.formatDistribution().get(0).format());
        assertEquals(71.4, summary.formatDistribution().get(0).percentage());
        assertEquals(1, summary.recentPhotos().size());
        assertEquals("RETOUCH", summary.recentPhotos().get(0).aiTransformType());
        assertEquals("portrait.jpg", summary.recentPhotos().get(0).fileName());
    }
}

