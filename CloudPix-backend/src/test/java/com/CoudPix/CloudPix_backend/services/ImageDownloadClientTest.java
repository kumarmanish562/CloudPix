package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.config.ImageKitProperties;
import com.CoudPix.CloudPix_backend.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class ImageDownloadClientTest {
    @Test
    @SuppressWarnings("unchecked")
    void streamsSuccessfulResponsesWithoutBufferingTheWholeFile() throws Exception {
        var http = org.mockito.Mockito.mock(java.net.http.HttpClient.class);
        java.net.http.HttpResponse<java.io.InputStream> response = org.mockito.Mockito.mock(java.net.http.HttpResponse.class);
        var body = new java.io.ByteArrayInputStream(new byte[] { 1, 2, 3 });
        org.mockito.Mockito.when(response.statusCode()).thenReturn(200);
        org.mockito.Mockito.when(response.body()).thenReturn(body);
        org.mockito.Mockito.when(http.send(org.mockito.ArgumentMatchers.any(java.net.http.HttpRequest.class),
                org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<java.io.InputStream>>any())).thenReturn(response);
        var downloader = new ImageDownloadClient(new ImageKitProperties("test", "test", "https://ik.imagekit.io/account/"), http);
        try (var stream = downloader.open("https://ik.imagekit.io/account/photo.png")) {
            assertSame(body, stream);
            assertArrayEquals(new byte[] { 1, 2, 3 }, stream.readAllBytes());
        }
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints = { 301, 404, 500 })
    @SuppressWarnings("unchecked")
    void rejectsRedirectsAndUpstreamErrorsAndClosesTheirBodies(int status) throws Exception {
        var http = org.mockito.Mockito.mock(java.net.http.HttpClient.class);
        java.net.http.HttpResponse<java.io.InputStream> response = org.mockito.Mockito.mock(java.net.http.HttpResponse.class);
        var body = org.mockito.Mockito.mock(java.io.InputStream.class);
        org.mockito.Mockito.when(response.statusCode()).thenReturn(status);
        org.mockito.Mockito.when(response.body()).thenReturn(body);
        org.mockito.Mockito.when(http.send(org.mockito.ArgumentMatchers.any(java.net.http.HttpRequest.class),
                org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<java.io.InputStream>>any())).thenReturn(response);
        var downloader = new ImageDownloadClient(new ImageKitProperties("test", "test", "https://ik.imagekit.io/account"), http);
        assertThrows(com.CoudPix.CloudPix_backend.exception.ImageKitUploadException.class,
                () -> downloader.open("https://ik.imagekit.io/account/photo.png"));
        org.mockito.Mockito.verify(body).close();
    }

    @Test
    void mapsTransportFailuresToProviderErrors() throws Exception {
        var http = org.mockito.Mockito.mock(java.net.http.HttpClient.class);
        org.mockito.Mockito.when(http.send(org.mockito.ArgumentMatchers.any(java.net.http.HttpRequest.class),
                org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<java.io.InputStream>>any())).thenThrow(new java.io.IOException());
        var downloader = new ImageDownloadClient(new ImageKitProperties("test", "test", "https://ik.imagekit.io/account"), http);
        assertThrows(com.CoudPix.CloudPix_backend.exception.ImageKitUploadException.class,
                () -> downloader.open("https://ik.imagekit.io/account/photo.png"));
    }

    @Test
    void preservesThreadInterruption() throws Exception {
        var http = org.mockito.Mockito.mock(java.net.http.HttpClient.class);
        org.mockito.Mockito.when(http.send(org.mockito.ArgumentMatchers.any(java.net.http.HttpRequest.class),
                org.mockito.ArgumentMatchers.<java.net.http.HttpResponse.BodyHandler<java.io.InputStream>>any())).thenThrow(new InterruptedException());
        var downloader = new ImageDownloadClient(new ImageKitProperties("test", "test", "https://ik.imagekit.io/account"), http);
        try {
            assertThrows(com.CoudPix.CloudPix_backend.exception.ImageKitUploadException.class,
                    () -> downloader.open("https://ik.imagekit.io/account/photo.png"));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally { Thread.interrupted(); }
    }

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

