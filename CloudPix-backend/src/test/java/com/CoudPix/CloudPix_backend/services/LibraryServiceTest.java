package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.*;
import com.CoudPix.CloudPix_backend.exception.ResourceNotFoundException;
import com.CoudPix.CloudPix_backend.repositories.PhotoRepository;
import io.imagekit.models.assets.AssetListResponse;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class LibraryServiceTest {
    private final PhotoRepository photos = mock(PhotoRepository.class);
    private final ImageKitService images = mock(ImageKitService.class);
    private final PhotoService photoService = mock(PhotoService.class);
    private final LibraryService library = new LibraryService(photos, images, photoService);
    private final User owner = User.builder().id(UUID.randomUUID()).build();
    private String folder() { return ImageKitService.userFolder(owner.getId()); }

    @Test
    void ignoresFoldersAndAssetsWithoutIdentifiers() {
        AssetListResponse folder = mock(AssetListResponse.class);
        var noIdentifier = io.imagekit.models.files.File.builder().name("no-id").build();
        when(images.listAssetsInFolder(folder(), 0, 100))
                .thenReturn(List.of(folder, AssetListResponse.ofFile(noIdentifier)));
        assertEquals(List.of(), library.listImportableAssets(owner));
        verifyNoInteractions(photoService);
    }

    @Test
    void listingUsesSafeDefaultsForMissingOptionalMetadata() {
        var file = io.imagekit.models.files.File.builder().fileId("owned").build();
        when(images.listAssetsInFolder(folder(), 0, 100)).thenReturn(List.of(AssetListResponse.ofFile(file)));
        var item = library.listImportableAssets(owner).getFirst();
        assertEquals("Untitled", item.fileName());
        assertEquals("", item.url());
        assertEquals(0, item.sizeBytes());
        assertNull(item.width());
        assertFalse(item.alreadyImported());
    }

    @Test
    void alreadyImportedAssetsAreNotRecreated() {
        when(photos.existsByImagekitFileIdAndUserId("existing", owner.getId())).thenReturn(true);
        assertEquals(List.of(), library.importAssets(owner, new ImportPhotosRequest(List.of("existing"))));
        verifyNoInteractions(images, photoService);
    }

    @Test
    void unownedAssetsAndAssetsWithoutUrlsCannotBeImported() {
        when(images.listAssetsInFolder(folder(), 0, 100)).thenReturn(List.of());
        assertThrows(ResourceNotFoundException.class, () -> library.importAssets(owner, new ImportPhotosRequest(List.of("foreign"))));
        var noUrl = io.imagekit.models.files.File.builder().fileId("missing-url").build();
        when(images.listAssetsInFolder(folder(), 0, 100)).thenReturn(List.of(AssetListResponse.ofFile(noUrl)));
        assertThrows(ResourceNotFoundException.class, () -> library.importAssets(owner, new ImportPhotosRequest(List.of("missing-url"))));
        verifyNoInteractions(photoService);
    }
}

