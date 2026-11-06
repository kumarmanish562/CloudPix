package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.config.ImageKitProperties;
import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.exception.*;
import io.imagekit.client.ImageKitClient;
import io.imagekit.errors.ImageKitException;
import io.imagekit.models.assets.*;
import io.imagekit.models.files.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ImageKitServiceTest {
    private final ImageKitClient sdk = mock(ImageKitClient.class, RETURNS_DEEP_STUBS);
    private final HttpClient http = mock(HttpClient.class);
    private final ImageKitProperties properties = new ImageKitProperties("public", "private", "https://ik.imagekit.io/test");
    private final ImageKitService service = new ImageKitService(sdk, properties, http, Duration.ZERO);
    private final User user = User.builder().id(UUID.randomUUID()).build();

    @Test
    void uploadsToTheOwnersFolderWithUniqueFilenames() {
        var response = FileUploadResponse.builder().fileId("file").build();
        when(sdk.files().upload(any(FileUploadParams.class))).thenReturn(response);
        assertSame(response, service.uploadPhoto(user, new MockMultipartFile("file", "portrait.png", "image/png", new byte[] { 1, 2 })));
        var params = ArgumentCaptor.forClass(FileUploadParams.class);
        verify(sdk.files()).upload(params.capture());
        assertEquals("portrait.png", params.getValue().fileName());
        assertEquals("/users/" + user.getId(), params.getValue().folder().orElseThrow());
        assertTrue(params.getValue().useUniqueFileName().orElseThrow());
    }

    @Test
    void rejectsMissingFilenamesBeforeCallingTheProvider() {
        assertThrows(BadRequestException.class, () -> service.uploadPhoto(user, new MockMultipartFile("file", "", "image/png", new byte[] { 1 })));
        verify(sdk.files(), never()).upload(any(FileUploadParams.class));
    }

    @Test
    void wrapsFileReadFailures() throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getBytes()).thenThrow(new IOException("disk unavailable"));
        assertThrows(ImageKitUploadException.class, () -> service.uploadPhoto(user, file));
    }

    @Test
    void uploadsDerivedBytesUsingTheOwnerFolder() {
        var response = FileUploadResponse.builder().fileId("derived").build();
        when(sdk.files().upload(any(FileUploadParams.class))).thenReturn(response);
        assertSame(response, service.uploadBytes(user, new byte[] { 1 }, "derived.png"));
        var params = ArgumentCaptor.forClass(FileUploadParams.class);
        verify(sdk.files()).upload(params.capture());
        assertEquals("derived.png", params.getValue().fileName());
        assertEquals("/users/" + user.getId(), params.getValue().folder().orElseThrow());
    }

    @Test
    void wrapsSdkUploadFailuresForBothUploadMethods() {
        when(sdk.files().upload(any(FileUploadParams.class))).thenThrow(mock(ImageKitException.class));
        assertThrows(ImageKitUploadException.class, () -> service.uploadBytes(user, new byte[] { 1 }, "photo.png"));
        assertThrows(ImageKitUploadException.class, () -> service.uploadPhoto(user, new MockMultipartFile("file", "photo.png", "image/png", new byte[] { 1 })));
    }

    @Test
    void deletesTheSpecifiedProviderFile() {
        service.deleteFile("owned-file");
        var params = ArgumentCaptor.forClass(FileDeleteParams.class);
        verify(sdk.files()).delete(params.capture());
        assertEquals("owned-file", params.getValue().fileId().orElseThrow());
    }

    @Test
    void wrapsSdkDeletionFailures() {
        var files = sdk.files();
        doThrow(mock(ImageKitException.class)).when(files).delete(any(FileDeleteParams.class));
        assertThrows(ImageKitUploadException.class, () -> service.deleteFile("owned-file"));
    }

    @Test
    void listsAssetsUsingFolderAndPagination() {
        when(sdk.assets().list(any(AssetListParams.class))).thenReturn(List.of());
        assertEquals(List.of(), service.listAssetsInFolder("/users/owner", 10, 25));
        var params = ArgumentCaptor.forClass(AssetListParams.class);
        verify(sdk.assets()).list(params.capture());
        assertEquals("/users/owner", params.getValue().path().orElseThrow());
        assertEquals(10L, params.getValue().skip().orElseThrow());
        assertEquals(25L, params.getValue().limit().orElseThrow());
    }

    @Test
    void wrapsSdkListingFailures() {
        when(sdk.assets().list(any(AssetListParams.class))).thenThrow(mock(ImageKitException.class));
        assertThrows(ImageKitUploadException.class, () -> service.listAssetsInFolder("/users/owner", 0, 10));
    }

    @Test
    void transformUrlsReplaceOldQueryParametersAndHaveACacheBuster() {
        String url = service.buildAiTransformUrl("https://ik.imagekit.io/test/a.png?old=1", "e-retouch");
        assertTrue(url.startsWith("https://ik.imagekit.io/test/a.png?tr=e-retouch&v="));
        assertFalse(url.contains("old=1"));
        assertEquals("https://ik.imagekit.io/test/a.png", service.buildAiTransformUrl("https://ik.imagekit.io/test/a.png", " "));
        assertEquals("https://ik.imagekit.io/test/a.png", service.buildAiTransformUrl("https://ik.imagekit.io/test/a.png", null));
        assertThrows(BadRequestException.class, () -> service.buildAiTransformUrl(null, "e-retouch"));
        assertThrows(BadRequestException.class, () -> service.buildAiTransformUrl(" ", "e-retouch"));
    }

    @Test
    void thumbnailAndPromptHelpersPreserveExistingQueriesAndUnicode() {
        assertNull(service.buildThumbnailUrl(null));
        assertEquals("", service.buildThumbnailUrl(""));
        assertNull(service.buildThumbnailUrlFromUrl(null));
        assertEquals(" ", service.buildThumbnailUrlFromUrl(" "));
        assertEquals("https://cdn/a.png?tr=w-400,h-400,fo-auto", service.buildThumbnailUrlFromUrl("https://cdn/a.png"));
        assertEquals("https://cdn/a.png?v=1&tr=w-400,h-400,fo-auto", service.buildThumbnailUrlFromUrl("https://cdn/a.png?v=1"));
        when(sdk.helper().buildUrl(any(io.imagekit.models.SrcOptions.class))).thenReturn("thumbnail");
        assertEquals("thumbnail", service.buildThumbnailUrl("folder/image.png"));
        assertEquals("thumbnail", service.buildThumbnailUrl("/folder/image.png"));
        assertEquals("blue sky ☀", new String(Base64.getUrlDecoder().decode(ImageKitService.encodePrompt(" blue sky ☀ ")), StandardCharsets.UTF_8));
    }

    @SuppressWarnings("unchecked")
    private HttpResponse<byte[]> response(int status, byte[] body, Map<String, List<String>> headers) {
        HttpResponse<byte[]> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        when(response.headers()).thenReturn(HttpHeaders.of(headers, (a, b) -> true));
        return response;
    }

    @Test
    void downloadsReadyImages() throws Exception {
        byte[] image = { 1, 2, 3 };
        var ready = response(200, image, Map.of("Content-Type", List.of("image/png")));
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()))
                .thenReturn(ready);
        assertArrayEquals(image, service.downloadTransformedImage("https://ik.imagekit.io/test/a.png"));
    }

    @ParameterizedTest @ValueSource(strings = {"intermediate", "html", "empty", "http-error", "io-error"})
    void retriesTransientResponsesThenReturnsTheReadyImage(String failure) throws Exception {
        var ready = response(200, new byte[] { 42 }, Map.of("Content-Type", List.of("image/png")));
        var failed = switch (failure) {
            case "intermediate" -> response(200, new byte[] { 1 }, Map.of("is-intermediate-response", List.of("true")));
            case "html" -> response(200, "<html>".getBytes(StandardCharsets.UTF_8), Map.of("Content-Type", List.of("text/html")));
            case "empty" -> response(200, new byte[0], Map.of());
            case "http-error" -> response(503, new byte[0], Map.of());
            default -> null;
        };
        var send = when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()));
        if (failed == null) send.thenThrow(new IOException("temporary")).thenReturn(ready);
        else send.thenReturn(failed, ready);
        assertArrayEquals(new byte[] { 42 }, service.downloadTransformedImage("https://ik.imagekit.io/test/a.png"));
        verify(http, times(2)).send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
    }

    @Test
    void stopsAfterTheConfiguredRetryBudget() throws Exception {
        var failed = response(500, new byte[0], Map.of());
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()))
                .thenReturn(failed);
        assertThrows(ImageKitUploadException.class, () -> service.downloadTransformedImage("https://ik.imagekit.io/test/a.png"));
        verify(http, times(12)).send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
    }

    @Test
    void intermediateResponsesEventuallyTimeOut() throws Exception {
        var intermediate = response(200, new byte[] { 1 }, Map.of("is-intermediate-response", List.of("true")));
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()))
                .thenReturn(intermediate);
        assertThrows(ImageKitUploadException.class, () -> service.downloadTransformedImage("https://ik.imagekit.io/test/a.png"));
        verify(http, times(12)).send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
    }

    @Test
    void interruptionCancelsRetriesAndPreservesTheInterruptFlag() throws Exception {
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any())).thenThrow(new InterruptedException());
        try {
            assertThrows(ImageKitUploadException.class, () -> service.downloadTransformedImage("https://ik.imagekit.io/test/a.png"));
            assertTrue(Thread.currentThread().isInterrupted());
            verify(http).send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any());
        } finally { Thread.interrupted(); }
    }

    @Test
    void interruptionWhileWaitingAlsoStopsRetries() throws Exception {
        var failed = response(503, new byte[0], Map.of());
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()))
                .thenReturn(failed);
        Thread.currentThread().interrupt();
        try {
            assertThrows(ImageKitUploadException.class, () -> service.downloadTransformedImage("https://ik.imagekit.io/test/a.png"));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally { Thread.interrupted(); }
    }
}

