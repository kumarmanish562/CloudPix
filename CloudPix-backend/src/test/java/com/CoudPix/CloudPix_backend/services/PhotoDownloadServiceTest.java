package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.*;
import com.CoudPix.CloudPix_backend.dto.PhotoStatus;
import com.CoudPix.CloudPix_backend.exception.*;
import com.CoudPix.CloudPix_backend.repositories.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.*;
import java.io.*;
import java.util.*;
import java.util.zip.ZipInputStream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class PhotoDownloadServiceTest {
    private final PhotoRepository photos = mock(PhotoRepository.class);
    private final AlbumRepository albums = mock(AlbumRepository.class);
    private final AlbumPhotoRepository members = mock(AlbumPhotoRepository.class);
    private final ImageDownloadClient images = mock(ImageDownloadClient.class);
    private final PhotoDownloadService service = new PhotoDownloadService(photos, albums, members, images);
    private final User owner = User.builder().id(UUID.randomUUID()).build();
    private final Album album = Album.builder().id(UUID.randomUUID()).user(owner).title("../Holiday").build();

    private void owned(long count) {
        when(albums.findByIdAndUserId(album.getId(), owner.getId())).thenReturn(Optional.of(album));
        when(albums.countPhotosByAlbumId(album.getId())).thenReturn(count);
    }

    @Test
    void emptyAlbumIsRejectedBeforeFetchingAnyImages() {
        owned(0);
        assertThrows(BadRequestException.class, () -> service.album(owner, album.getId()));
        verifyNoInteractions(images, members);
    }

    @Test
    void oversizedAlbumIsRejectedBeforeFetchingAnyImages() {
        owned(501);
        assertThrows(BadRequestException.class, () -> service.album(owner, album.getId()));
        verifyNoInteractions(images, members);
    }

    @Test
    void unknownAlbumDoesNotLeakAnyImages() {
        assertThrows(ResourceNotFoundException.class, () -> service.album(owner, UUID.randomUUID()));
        verifyNoInteractions(images);
    }

    @Test
    void duplicateFilenamesProduceDistinctSafeZipEntries() throws Exception {
        owned(2);
        Photo a = Photo.builder().id(UUID.randomUUID()).fileName("../same.png").url("first").build();
        Photo b = Photo.builder().id(UUID.randomUUID()).fileName("../same.png").url("second").build();
        when(members.findByAlbumIdAndUserId(eq(album.getId()), eq(owner.getId()), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(AlbumPhoto.builder().photo(a).build(), AlbumPhoto.builder().photo(b).build())));
        when(images.open("first")).thenReturn(new ByteArrayInputStream(new byte[] { 1 }));
        when(images.open("second")).thenReturn(new ByteArrayInputStream(new byte[] { 2 }));
        var response = service.album(owner, album.getId());
        assertNotNull(response.getBody());
        try (var zip = new ZipInputStream(response.getBody().getInputStream())) {
            assertEquals("001-.._same.png", zip.getNextEntry().getName());
            assertArrayEquals(new byte[] { 1 }, zip.readAllBytes());
            assertEquals("002-.._same.png", zip.getNextEntry().getName());
            assertArrayEquals(new byte[] { 2 }, zip.readAllBytes());
            assertNull(zip.getNextEntry());
        }
    }

    @Test
    void downloadReadFailureClosesTheProviderStreamAndReturnsNoSuccess() throws Exception {
        owned(1);
        Photo photo = Photo.builder().fileName("photo.png").url("broken").build();
        when(members.findByAlbumIdAndUserId(eq(album.getId()), eq(owner.getId()), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(AlbumPhoto.builder().photo(photo).build())));
        InputStream input = mock(InputStream.class);
        when(input.read(any(byte[].class))).thenThrow(new IOException("connection reset"));
        when(images.open("broken")).thenReturn(input);
        assertThrows(ImageKitUploadException.class, () -> service.album(owner, album.getId()));
        verify(input).close();
    }

    @Test
    void archivedOriginalCanBeDownloadedButTrashCannot() throws Exception {
        Photo photo = Photo.builder().fileName("safe.png").url("original").status(PhotoStatus.ARCHIVE).build();
        when(photos.findByIdAndUserId(any(UUID.class), eq(owner.getId()))).thenReturn(Optional.of(photo));
        when(images.open("original")).thenReturn(new ByteArrayInputStream(new byte[] { 3 }));
        var response = service.photo(owner, UUID.randomUUID());
        try (var input = response.getBody().getInputStream()) { assertArrayEquals(new byte[] { 3 }, input.readAllBytes()); }
        photo.setStatus(PhotoStatus.TRASH);
        assertThrows(BadRequestException.class, () -> service.photo(owner, UUID.randomUUID()));
        verify(images).open("original");
    }
}

