package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.*;
import com.CoudPix.CloudPix_backend.dto.*;
import com.CoudPix.CloudPix_backend.exception.*;
import com.CoudPix.CloudPix_backend.repositories.PhotoRepository;
import io.imagekit.models.files.FileUploadResponse;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class PhotoServiceTest {
    private final PhotoRepository repository = mock(PhotoRepository.class);
    private final ImageKitService images = mock(ImageKitService.class);
    private final PhotoService service = new PhotoService(repository, images);
    private final User owner = User.builder().id(UUID.randomUUID()).build();
    private final Map<UUID, Photo> saved = new HashMap<>();

    @BeforeEach
    void persistence() {
        when(repository.save(any(Photo.class))).thenAnswer(invocation -> {
            Photo photo = invocation.getArgument(0);
            if (photo.getId() == null) photo.setId(UUID.randomUUID());
            if (photo.getCreatedAt() == null) photo.setCreatedAt(Instant.now());
            saved.put(photo.getId(), photo);
            return photo;
        });
        when(repository.findById(any(UUID.class))).thenAnswer(invocation -> Optional.ofNullable(saved.get(invocation.getArgument(0))));
    }

    @Test
    void derivedPhotoKeepsItsParentAndUsesSourceMetadataWhenOptionalFieldsAreMissing() {
        Photo parent = Photo.builder().id(UUID.randomUUID()).fileName("source.jpg").mimeType("image/jpeg").width(400).height(200).build();
        when(images.buildThumbnailUrlFromUrl("https://cdn/derived.jpg")).thenReturn("thumbnail");
        var result = service.createDerivedPhoto(owner, parent,
                FileUploadResponse.builder().fileId("derived").url("https://cdn/derived.jpg").build(), AiTransformType.RETOUCH);
        assertEquals(parent.getId(), result.parentPhotoId());
        assertEquals(AiTransformType.RETOUCH, result.aiTransformType());
        assertEquals("source.jpg", result.fileName());
        assertEquals("image/jpeg", result.mimeType());
        assertEquals(400, result.width());
        assertEquals(200, result.height());
        assertEquals(0L, result.sizeBytes());
        assertEquals("thumbnail", result.thumbnailUrl());
    }

    @Test
    void missingProviderIdentifiersOrUrlsCannotCreateDerivedPhotos() {
        Photo parent = Photo.builder().fileName("source.png").build();
        assertThrows(BadRequestException.class, () -> service.createDerivedPhoto(owner, parent,
                FileUploadResponse.builder().url("https://cdn/file.png").build(), AiTransformType.RETOUCH));
        assertThrows(BadRequestException.class, () -> service.createDerivedPhoto(owner, parent,
                FileUploadResponse.builder().fileId("id").build(), AiTransformType.RETOUCH));
        verify(repository, never()).save(any());
    }

    @Test
    void duplicateProviderReferencesCannotBeSavedTwice() {
        when(repository.existsByImagekitFileIdAndUserId("existing", owner.getId())).thenReturn(true);
        assertThrows(ResourceConflictException.class, () -> service.createPhoto(owner,
                new CreatePhotoRequest("existing", "file.png", "https://cdn/file.png", null, "image/png", 1L, null, null)));
        verify(repository, never()).save(any());
    }

    @Test
    void unreadableUploadsNeverReachTheProvider() throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getSize()).thenReturn(10L);
        when(file.getContentType()).thenReturn("image/png");
        when(file.getInputStream()).thenThrow(new IOException("read failed"));
        assertThrows(BadRequestException.class, () -> service.uploadPhoto(owner, file));
        verifyNoInteractions(images);
    }

    @Test
    void missingUploadMimeTypeIsRejected() {
        assertThrows(BadRequestException.class, () -> service.uploadPhoto(owner,
                new MockMultipartFile("file", "photo.png", null, new byte[] { 1 })));
        verifyNoInteractions(images);
    }

    @Test
    void missingUploadProviderFieldsAreRejected() {
        MultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[] { 1 });
        when(images.uploadPhoto(owner, file)).thenReturn(FileUploadResponse.builder().url("https://cdn/photo.png").build());
        assertThrows(BadRequestException.class, () -> service.uploadPhoto(owner, file));
        when(images.uploadPhoto(owner, file)).thenReturn(FileUploadResponse.builder().fileId("id").build());
        assertThrows(BadRequestException.class, () -> service.uploadPhoto(owner, file));
        verify(repository, never()).save(any());
    }

    @Test
    void uploadCanBuildAThumbnailFromTheProviderFilePath() {
        MultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[] { 1 });
        when(images.uploadPhoto(owner, file)).thenReturn(FileUploadResponse.builder()
                .fileId("id").url("https://cdn/photo.png").filePath("/users/photo.png").build());
        when(images.buildThumbnailUrlFromUrl(anyString())).thenReturn("");
        when(images.buildThumbnailUrl("/users/photo.png")).thenReturn("path-thumbnail");
        var result = service.uploadPhoto(owner, file);
        assertEquals("path-thumbnail", result.thumbnailUrl());
        assertEquals(64, result.contentHash().length());
    }

    @Test
    void photoListingPreservesPaginationAndOwnerScope() {
        Photo photo = Photo.builder().id(UUID.randomUUID()).fileName("archived.png").status(PhotoStatus.ARCHIVE).build();
        Pageable page = PageRequest.of(1, 1);
        when(repository.findByUserIdAndStatus(owner.getId(), PhotoStatus.ARCHIVE, page))
                .thenReturn(new PageImpl<>(List.of(photo), page, 3));
        var result = service.listPhotos(owner, PhotoStatus.ARCHIVE, page);
        assertEquals(3, result.totalElements());
        assertEquals(1, result.page());
        assertEquals("archived.png", result.content().getFirst().fileName());
        assertFalse(result.last());
    }
}

