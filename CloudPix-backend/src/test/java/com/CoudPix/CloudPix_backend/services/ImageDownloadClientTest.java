package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.config.ImageKitProperties;
import com.CoudPix.CloudPix_backend.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class ImageDownloadClientTest {
    private final ImageDownloadClient client = new ImageDownloadClient(
            new ImageKitProperties("test", "test", "https://ik.imagekit.io/account"));

    @ParameterizedTest
    @ValueSource(strings = {
            "http://ik.imagekit.io/account/image.png",
            "https://evil.example/account/image.png",
            "https://ik.imagekit.io/another-account/image.png",
            "https://ik.imagekit.io/account-impersonator/image.png",
            "https://ik.imagekit.io:444/account/image.png",
            "https://user:password@ik.imagekit.io/account/image.png",
            "https://ik.imagekit.io/account/../private.png",
            "https://ik.imagekit.io/account/%2e%2e/private.png",
            "https://ik.imagekit.io/account/%5cprivate.png",
            "file:///etc/passwd",
            "not a valid URI"
    })
    void rejectsUrlsOutsideConfiguredCdnBeforeMakingAnyNetworkRequest(String url) {
        assertThrows(BadRequestException.class, () -> client.open(url));
    }

    @Test
    void zipEntryNamesCannotContainPathsOrControlCharacters() {
        String name = PhotoDownloadService.safeName("../folder\\secret\r\n.png");
        assertFalse(name.contains("/"));
        assertFalse(name.contains("\\"));
        assertFalse(name.contains("\r"));
        assertFalse(name.contains("\n"));
        assertEquals("photo", PhotoDownloadService.safeName(".."));
        assertTrue(PhotoDownloadService.safeName("x".repeat(500)).length() <= 180);
    }
}

