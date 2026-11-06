package com.CoudPix.CloudPix_backend;

import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.services.*;
import io.imagekit.models.files.FileUploadResponse;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.io.*;
import java.time.*;
import java.util.*;
import java.util.zip.ZipInputStream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real MVC/security/services/JPA/Flyway; only the external media provider is mocked. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "debug=false")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CloudPixWorkflowTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @org.springframework.beans.factory.annotation.Value("${local.server.port}") int port;
    @MockitoBean ImageKitService imagekit;
    @MockitoBean ImageDownloadClient downloadClient;
    private final JsonMapper json = new JsonMapper();
    private static final byte[] IMAGE = new byte[] { (byte)137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4 };

    record Session(String token, String refresh, String userId, String email) {}

    @BeforeEach
    void storage() {
        when(imagekit.uploadPhoto(any(User.class), any(MultipartFile.class))).thenAnswer(invocation -> {
            MultipartFile file = invocation.getArgument(1);
            String id = UUID.randomUUID().toString();
            return FileUploadResponse.builder().fileId(id).name(file.getOriginalFilename())
                    .url("https://ik.imagekit.io/test/" + id + ".png")
                    .thumbnailUrl("https://ik.imagekit.io/test/" + id + ".png")
                    .size((double)file.getSize()).width(20.0).height(10.0).build();
        });
        when(downloadClient.open(anyString())).thenAnswer(ignored -> new ByteArrayInputStream(IMAGE));
        when(imagekit.buildThumbnailUrlFromUrl(anyString())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void completePhotoLifecycleFromRegistrationThroughDeletion() throws Exception {
        Session owner = register();
        mvc.perform(get("/api/photos")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", owner.email(), "password", "wrong-password")))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", owner.email(), "password", "StrongPass123!")))).andExpect(status().isOk());
        mvc.perform(auth(get("/api/auth/me"), owner)).andExpect(jsonPath("$.id").value(owner.userId()));

        JsonNode photo = upload(owner, "holiday.png", IMAGE, false, 201);
        String id = photo.get("id").asText();
        assertFalse(photo.get("favorite").asBoolean());
        assertEquals(64, photo.get("contentHash").asText().length());
        mvc.perform(auth(patch("/api/photos/" + id), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("favorite", true, "tags", List.of("Travel", " Family ", "travel")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.favorite").value(true))
                .andExpect(jsonPath("$.tags.length()").value(2));
        mvc.perform(auth(get("/api/photos").param("q", "travel").param("favorite", "true")
                .param("tag", "family").param("mimeType", "image/png").param("sort", "name"), owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(auth(get("/api/photos").param("q", "not-present"), owner))
                .andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(auth(get("/api/photos/tags"), owner)).andExpect(jsonPath("$[0]").value("family"));

        JsonNode album = result(auth(post("/api/albums"), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("title", "Trip"))), 201);
        String albumId = album.get("id").asText();
        var membership = Map.of("photoIds", List.of(id));
        performJson(owner, "/api/albums/" + albumId + "/photos", membership, 204);
        performJson(owner, "/api/albums/" + albumId + "/photos", membership, 204);
        mvc.perform(auth(get("/api/albums/" + albumId), owner)).andExpect(jsonPath("$.photoCount").value(1));

        byte[] single = mvc.perform(auth(get("/api/photos/" + id + "/download"), owner))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "application/octet-stream"))
                .andReturn().getResponse().getContentAsByteArray();
        assertArrayEquals(IMAGE, single);
        byte[] archive = mvc.perform(auth(get("/api/albums/" + albumId + "/download"), owner))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "application/zip"))
                .andReturn().getResponse().getContentAsByteArray();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive))) {
            assertEquals("001-holiday.png", zip.getNextEntry().getName());
            assertArrayEquals(IMAGE, zip.readAllBytes());
            assertNull(zip.getNextEntry());
        }

        JsonNode share = result(auth(post("/api/albums/" + albumId + "/shares"), owner)
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("expiresInHours", 24))), 201);
        String shareToken = share.get("token").asText();
        assertEquals(43, shareToken.length());
        mvc.perform(get("/api/shared/" + shareToken)).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store")).andExpect(jsonPath("$.photos.totalElements").value(1))
                .andExpect(jsonPath("$.photos.content[0].tags").doesNotExist());
        assertArrayEquals(IMAGE, mvc.perform(get("/api/shared/" + shareToken + "/photos/" + id))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andReturn().getResponse().getContentAsByteArray());
        mvc.perform(auth(get("/api/albums/" + albumId + "/shares"), owner))
                .andExpect(jsonPath("$[0].token").isEmpty());

        performJson(owner, "/api/photos/archive", membership, 204);
        mvc.perform(get("/api/shared/" + shareToken + "/photos/" + id)).andExpect(status().isNotFound());
        mvc.perform(get("/api/shared/" + shareToken)).andExpect(jsonPath("$.photos.totalElements").value(0));
        performJson(owner, "/api/photos/restore", membership, 204);
        performJson(owner, "/api/photos/delete-permanent", membership, 400);
        performJson(owner, "/api/photos/trash", membership, 204);
        mvc.perform(auth(get("/api/photos").param("status", "TRASH"), owner)).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(auth(get("/api/photos/" + id + "/download"), owner)).andExpect(status().isBadRequest());
        performJson(owner, "/api/photos/restore", membership, 204);
        mvc.perform(auth(get("/api/library/storage"), owner)).andExpect(jsonPath("$.libraryUsedBytes").value(IMAGE.length));

        // Deleting a photo used as a cover must remove membership and clear the cover.
        performJson(owner, "/api/photos/trash", membership, 204);
        performJson(owner, "/api/photos/delete-permanent", membership, 204);
        mvc.perform(auth(get("/api/photos/" + id), owner)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/albums/" + albumId), owner))
                .andExpect(jsonPath("$.photoCount").value(0)).andExpect(jsonPath("$.coverPhotoId").isEmpty());
        verify(imagekit).deleteFile(photo.get("imagekitFileId").asText());

        mvc.perform(auth(delete("/api/albums/" + albumId + "/shares/" + share.get("id").asText()), owner))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/shared/" + shareToken)).andExpect(status().isNotFound());
        mvc.perform(auth(delete("/api/albums/" + albumId), owner)).andExpect(status().isNoContent());
        mvc.perform(get("/api/shared/" + shareToken)).andExpect(status().isNotFound());
        performJson(null, "/api/auth/logout", Map.of("refreshToken", owner.refresh()), 204);
        performJson(null, "/api/auth/refresh", Map.of("refreshToken", owner.refresh()), 401);
    }

    @Test
    void duplicateUploadsAreDetectedAndExplicitCopiesCanBeManaged() throws Exception {
        Session owner = register();
        upload(owner, "first.png", IMAGE, false, 201);
        upload(owner, "renamed.png", IMAGE, false, 409);
        upload(owner, "copy.png", IMAGE, true, 201);
        mvc.perform(auth(get("/api/photos/duplicates"), owner)).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
        Session other = register();
        upload(other, "same-bytes-other-owner.png", IMAGE, false, 201);
        mvc.perform(auth(get("/api/photos/duplicates"), other)).andExpect(jsonPath("$.totalElements").value(0));
        // A rejected duplicate must not be uploaded to ImageKit.
        verify(imagekit, times(3)).uploadPhoto(any(User.class), any(MultipartFile.class));
    }

    @Test
    void ownershipExpiryAndValidationAreEnforced() throws Exception {
        Session owner = register(), stranger = register();
        String photoId = upload(owner, "private.png", IMAGE, false, 201).get("id").asText();
        String albumId = result(auth(post("/api/albums"), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("title", "Private"))), 201).get("id").asText();
        for (String path : List.of("/api/photos/" + photoId, "/api/photos/" + photoId + "/download",
                "/api/albums/" + albumId, "/api/albums/" + albumId + "/photos", "/api/albums/" + albumId + "/shares",
                "/api/albums/" + albumId + "/download"))
            mvc.perform(auth(get(path), stranger)).andExpect(status().isNotFound());
        mvc.perform(auth(patch("/api/photos/" + photoId), stranger).contentType(MediaType.APPLICATION_JSON)
                .content("{\"favorite\":true}")).andExpect(status().isNotFound());
        performJson(stranger, "/api/photos/trash", Map.of("photoIds", List.of(photoId)), 404);
        performJson(stranger, "/api/albums/" + albumId + "/shares", Map.of("expiresInHours", 24), 404);
        performJson(owner, "/api/albums/" + albumId + "/shares", Map.of("expiresInHours", 0), 400);
        performJson(owner, "/api/albums/" + albumId + "/shares", Map.of("expiresInHours", 721), 400);
        JsonNode share = result(auth(post("/api/albums/" + albumId + "/shares"), owner)
                .contentType(MediaType.APPLICATION_JSON).content("{\"expiresInHours\":1}"), 201);
        jdbc.update("update album_shares set expires_at = ? where id = ?", Instant.now().minusSeconds(1).atOffset(ZoneOffset.UTC), UUID.fromString(share.get("id").asText()));
        mvc.perform(get("/api/shared/" + share.get("token").asText())).andExpect(status().isNotFound());
        mvc.perform(get("/api/shared/not-a-valid-token")).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/photos").param("page", "-1"), owner)).andExpect(status().isBadRequest());
        mvc.perform(auth(get("/api/photos").param("size", "101"), owner)).andExpect(status().isBadRequest());
        mvc.perform(auth(get("/api/photos").param("sort", "arbitrary-column"), owner)).andExpect(status().isBadRequest());
        mvc.perform(auth(get("/api/photos").param("from", "2026-11-05T00:00:00Z").param("to", "2026-11-04T00:00:00Z"), owner))
                .andExpect(status().isBadRequest());
        mvc.perform(auth(patch("/api/photos/" + photoId), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("tags", List.of("x".repeat(51)))))).andExpect(status().isBadRequest());
        mvc.perform(auth(patch("/api/photos/" + photoId), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("tags", List.of("   "))))).andExpect(status().isBadRequest());
        mvc.perform(auth(multipart("/api/photos/upload").file(new MockMultipartFile("file", "bad.txt", "text/plain", IMAGE)), owner))
                .andExpect(status().isBadRequest());
        mvc.perform(auth(multipart("/api/photos/upload").file(new MockMultipartFile("file", "empty.png", "image/png", new byte[0])), owner))
                .andExpect(status().isBadRequest());
    }

    @Test
    void memoriesUseUploadAnniversariesAndExcludeArchiveTrashAndOtherOwners() throws Exception {
        Session owner = register(), other = register();
        String id = upload(owner, "old.png", IMAGE, false, 201).get("id").asText();
        upload(other, "not-mine.png", IMAGE, false, 201);
        jdbc.update("update photos set created_at = ? where id = ?", Instant.parse("2024-05-12T12:00:00Z").atOffset(ZoneOffset.UTC), UUID.fromString(id));
        mvc.perform(auth(get("/api/photos/memories").param("date", "2026-05-12"), owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(auth(get("/api/photos/memories").param("date", "2026-05-13"), owner)).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(auth(get("/api/photos").param("from", "2024-05-12T00:00:00Z").param("to", "2024-05-13T00:00:00Z"), owner))
                .andExpect(jsonPath("$.totalElements").value(1));
        performJson(owner, "/api/photos/archive", Map.of("photoIds", List.of(id)), 204);
        mvc.perform(auth(get("/api/photos/memories").param("date", "2026-05-12"), owner)).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void refreshTokensRotateAndReplayIsRejected() throws Exception {
        Session user = register();
        JsonNode refreshed = result(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("refreshToken", user.refresh()))), 200);
        assertNotEquals(user.refresh(), refreshed.get("refreshToken").asText());
        performJson(null, "/api/auth/refresh", Map.of("refreshToken", user.refresh()), 401);
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + refreshed.get("accessToken").asText()))
                .andExpect(status().isOk());
        performJson(null, "/api/auth/logout", Map.of("refreshToken", refreshed.get("refreshToken").asText()), 204);
        performJson(null, "/api/auth/refresh", Map.of("refreshToken", refreshed.get("refreshToken").asText()), 401);
    }

    @Test
    void actualHttpServerStartsAndServesAuthenticatedRequests() throws Exception {
        var client = java.net.http.HttpClient.newHttpClient();
        var registered = client.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://localhost:" + port + "/api/auth/register"))
                .header("Content-Type", "application/json").POST(java.net.http.HttpRequest.BodyPublishers.ofString(body(Map.of(
                        "email", UUID.randomUUID() + "@example.com", "password", "StrongPass123!", "displayName", "HTTP user")))).build(),
                java.net.http.HttpResponse.BodyHandlers.ofString());
        assertEquals(201, registered.statusCode());
        String token = json.readTree(registered.body()).get("accessToken").asText();
        var response = client.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://localhost:" + port + "/api/photos"))
                .header("Authorization", "Bearer " + token).GET().build(), java.net.http.HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode());
        assertEquals(0, json.readTree(response.body()).get("totalElements").asInt());
    }

    @Test
    void ownedImageKitAssetsCanBeImportedOnceAndPaginated() throws Exception {
        Session owner = register();
        var asset = io.imagekit.models.files.File.builder().fileId("owned-" + UUID.randomUUID()).name("imported.png")
                .url("https://ik.imagekit.io/test/imported.png").mime("image/png").size(42.0).width(10.0).height(10.0).build();
        when(imagekit.listAssetsInFolder(eq(ImageKitService.userFolder(UUID.fromString(owner.userId()))), anyLong(), anyLong()))
                .thenReturn(List.of(io.imagekit.models.assets.AssetListResponse.ofFile(asset)));
        mvc.perform(auth(get("/api/library/imagekit-assets"), owner)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alreadyImported").value(false));
        performJson(owner, "/api/library/import", Map.of("imagekitFileIds", List.of(asset.fileId().orElseThrow())), 200);
        mvc.perform(auth(get("/api/library/imagekit-assets"), owner)).andExpect(jsonPath("$[0].alreadyImported").value(true));
        mvc.perform(auth(post("/api/library/import"), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("imagekitFileIds", List.of(asset.fileId().orElseThrow())))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        upload(owner, "newer.png", IMAGE, false, 201);
        mvc.perform(auth(get("/api/photos").param("size", "1").param("sort", "oldest"), owner))
                .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.content[0].fileName").value("imported.png"))
                .andExpect(jsonPath("$.last").value(false));
        mvc.perform(auth(get("/api/photos").param("size", "1").param("page", "1").param("sort", "oldest"), owner))
                .andExpect(jsonPath("$.content[0].fileName").value("newer.png")).andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void providerFailuresDoNotReportSuccessOrDeleteDatabaseRecords() throws Exception {
        Session owner = register();
        String id = upload(owner, "preserved.png", IMAGE, false, 201).get("id").asText();
        when(downloadClient.open(anyString())).thenThrow(new com.CoudPix.CloudPix_backend.exception.ImageKitUploadException("provider error"));
        mvc.perform(auth(get("/api/photos/" + id + "/download"), owner)).andExpect(status().isBadGateway());
        performJson(owner, "/api/photos/trash", Map.of("photoIds", List.of(id)), 204);
        doThrow(new com.CoudPix.CloudPix_backend.exception.ImageKitUploadException("provider error")).when(imagekit).deleteFile(anyString());
        performJson(owner, "/api/photos/delete-permanent", Map.of("photoIds", List.of(id)), 502);
        mvc.perform(auth(get("/api/photos/" + id), owner)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("TRASH"));
        when(imagekit.uploadPhoto(any(User.class), any(MultipartFile.class)))
                .thenThrow(new com.CoudPix.CloudPix_backend.exception.ImageKitUploadException("provider error"));
        upload(owner, "failed.png", new byte[] { 1, 2, 3 }, false, 502);
        mvc.perform(auth(get("/api/photos"), owner)).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void aiPreviewApplyAndImportRespectOwnershipAndActiveStatus() throws Exception {
        Session owner = register(), stranger = register();
        String id = upload(owner, "original.png", IMAGE, false, 201).get("id").asText();
        when(imagekit.buildAiTransformUrl(anyString(), anyString())).thenReturn("https://ik.imagekit.io/test/transformed.png");
        when(imagekit.downloadTransformedImage(anyString())).thenReturn(IMAGE);
        when(imagekit.uploadBytes(any(User.class), any(byte[].class), anyString())).thenReturn(FileUploadResponse.builder()
                .fileId(UUID.randomUUID().toString()).name("edited.png").url("https://ik.imagekit.io/test/edited.png").size(12.0).build());
        var request = Map.of("type", "SMART_CROP", "width", 300, "height", 200);
        JsonNode preview = result(auth(post("/api/photos/" + id + "/ai/preview"), owner)
                .contentType(MediaType.APPLICATION_JSON).content(body(request)), 200);
        assertEquals("w-300,h-200,fo-auto", preview.get("transformChain").asText());
        JsonNode applied = result(auth(post("/api/photos/" + id + "/ai/apply"), owner)
                .contentType(MediaType.APPLICATION_JSON).content(body(request)), 200);
        assertEquals(id, applied.get("parentPhotoId").asText());
        assertEquals("SMART_CROP", applied.get("aiTransformType").asText());
        performJson(stranger, "/api/photos/" + id + "/ai/preview", request, 404);
        performJson(owner, "/api/photos/" + id + "/ai/preview", Map.of("type", "SMART_CROP", "width", 5, "height", 200), 400);
        performJson(owner, "/api/photos/" + id + "/ai/preview", Map.of("type", "CHANGE_BACKGROUND"), 400);
        performJson(owner, "/api/photos/trash", Map.of("photoIds", List.of(id)), 204);
        performJson(owner, "/api/photos/" + id + "/ai/apply", request, 404);
        // Raw metadata cannot import someone else's provider file by spoofing a URL.
        performJson(stranger, "/api/photos", Map.of("imagekitFileId", "unowned", "fileName", "spoof.png",
                "url", "https://evil.example/image.png", "sizeBytes", 12), 404);
    }


    @Test
    void albumEditingRemovalAndCoverOwnershipAreEnforced() throws Exception {
        Session owner = register(), other = register();
        String photo = upload(owner, "cover.png", IMAGE, false, 201).get("id").asText();
        String foreign = upload(other, "foreign.png", IMAGE, false, 201).get("id").asText();
        String album = result(auth(post("/api/albums"), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("title", "Original"))), 201).get("id").asText();
        performJson(owner, "/api/albums/" + album + "/photos", Map.of("photoIds", List.of(photo, photo)), 204);
        mvc.perform(auth(patch("/api/albums/" + album), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("title", "Renamed", "coverPhotoId", photo))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Renamed"))
                .andExpect(jsonPath("$.coverPhotoId").value(photo));
        mvc.perform(auth(get("/api/albums"), owner)).andExpect(jsonPath("$[0].title").value("Renamed"));
        mvc.perform(auth(get("/api/albums/" + album + "/photos"), owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(auth(patch("/api/albums/" + album), other).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Stolen\"}")).andExpect(status().isNotFound());
        mvc.perform(auth(patch("/api/albums/" + album), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("coverPhotoId", foreign)))).andExpect(status().isNotFound());
        performJson(owner, "/api/photos/archive", Map.of("photoIds", List.of(photo)), 204);
        mvc.perform(auth(patch("/api/albums/" + album), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("coverPhotoId", photo)))).andExpect(status().isBadRequest());
        performJson(owner, "/api/albums/" + album + "/photos", Map.of("photoIds", List.of(photo)), 400);
        performJson(owner, "/api/albums/" + album + "/photos", Map.of("photoIds", List.of(foreign)), 404);
        performJson(owner, "/api/photos/restore", Map.of("photoIds", List.of(photo)), 204);
        mvc.perform(auth(delete("/api/albums/" + album + "/photos/" + photo), owner)).andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/albums/" + album), owner)).andExpect(jsonPath("$.coverPhotoId").isEmpty())
                .andExpect(jsonPath("$.photoCount").value(0));
        mvc.perform(auth(delete("/api/albums/" + album + "/photos/" + photo), owner)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/albums/" + album + "/download"), owner)).andExpect(status().isBadRequest());
    }

    @Test
    void badRequestsAndCorsAreHandledBeforeAnyProviderCalls() throws Exception {
        Session owner = register();
        performJson(null, "/api/auth/register", Map.of("email", owner.email().toUpperCase(Locale.ROOT),
                "password", "StrongPass123!", "displayName", "Duplicate"), 409);
        performJson(null, "/api/auth/register", Map.of("email", "not-an-email", "password", "short", "displayName", ""), 400);
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{broken")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/logout")).andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isNoContent());
        mvc.perform(auth(multipart("/api/photos/upload"), owner)).andExpect(status().isBadRequest());
        MockMultipartFile oversized = new MockMultipartFile("file", "large.png", "image/png", IMAGE) {
            @Override public long getSize() { return 26L * 1024 * 1024; }
        };
        mvc.perform(auth(multipart("/api/photos/upload").file(oversized), owner)).andExpect(status().isBadRequest());
        mvc.perform(auth(get("/api/photos/not-a-uuid"), owner)).andExpect(status().isBadRequest());
        mvc.perform(auth(get("/api/photos").param("status", "INVALID"), owner)).andExpect(status().isBadRequest());
        mvc.perform(auth(get("/api/photos").param("q", "x".repeat(201)), owner)).andExpect(status().isBadRequest());
        mvc.perform(auth(get("/api/photos").param("tag", "x".repeat(51)), owner)).andExpect(status().isBadRequest());
        mvc.perform(auth(get("/api/photos/memories").param("date", "not-a-date"), owner)).andExpect(status().isBadRequest());
        performJson(owner, "/api/photos/trash", Map.of("photoIds", List.of()), 400);
        mvc.perform(options("/api/photos").header("Origin", "http://localhost:3000")
                .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
        mvc.perform(options("/api/photos").header("Origin", "https://untrusted.example")
                .header("Access-Control-Request-Method", "GET")).andExpect(status().isForbidden());
        verify(imagekit, never()).uploadPhoto(any(), any());
    }

    @Test
    void metadataPatchesPreserveOmittedFieldsAndBulkValidationHasNoPartialSideEffects() throws Exception {
        Session owner = register();
        String first = upload(owner, "a.png", IMAGE, false, 201).get("id").asText();
        String second = upload(owner, "b.png", new byte[] { 4, 5, 6 }, false, 201).get("id").asText();
        mvc.perform(auth(patch("/api/photos/" + first), owner).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("favorite", true, "tags", List.of("Family"))))).andExpect(status().isOk());
        mvc.perform(auth(patch("/api/photos/" + first), owner).contentType(MediaType.APPLICATION_JSON)
                .content("{\"favorite\":false}")).andExpect(status().isOk()).andExpect(jsonPath("$.tags[0]").value("family"));
        mvc.perform(auth(patch("/api/photos/" + first), owner).contentType(MediaType.APPLICATION_JSON)
                .content("{\"tags\":[]}")).andExpect(status().isOk()).andExpect(jsonPath("$.tags.length()").value(0));
        mvc.perform(auth(get("/api/photos").param("favorite", "false").param("sort", "size"), owner))
                .andExpect(jsonPath("$.totalElements").value(2));
        performJson(owner, "/api/photos/trash", Map.of("photoIds", List.of(first, first)), 204);
        performJson(owner, "/api/photos/delete-permanent", Map.of("photoIds", List.of(first, second)), 400);
        verify(imagekit, never()).deleteFile(anyString());
        mvc.perform(auth(get("/api/photos/" + first), owner)).andExpect(jsonPath("$.status").value("TRASH"));
        mvc.perform(auth(get("/api/photos/" + second), owner)).andExpect(jsonPath("$.status").value("ACTIVE"));
        performJson(owner, "/api/photos/trash", Map.of("photoIds", List.of(second)), 204);
        mvc.perform(auth(delete("/api/photos/" + second), owner)).andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/photos/" + second), owner)).andExpect(status().isNotFound());
    }

    @Test
    void shareLimitsAndRevocationCannotBeBypassedAcrossAlbums() throws Exception {
        Session owner = register();
        String album = result(auth(post("/api/albums"), owner).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Limited\"}"), 201).get("id").asText();
        List<UUID> ids = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            UUID id = UUID.randomUUID(); ids.add(id);
            jdbc.update("insert into album_shares (id, album_id, token_hash, expires_at) values (?, ?, ?, ?)",
                    id, UUID.fromString(album), UUID.randomUUID().toString().replace("-", "").repeat(2),
                    Instant.now().plusSeconds(3600).atOffset(ZoneOffset.UTC));
        }
        performJson(owner, "/api/albums/" + album + "/shares", Map.of("expiresInHours", 24), 400);
        mvc.perform(auth(delete("/api/albums/" + album + "/shares/" + ids.getFirst()), owner)).andExpect(status().isNoContent());
        JsonNode share = result(auth(post("/api/albums/" + album + "/shares"), owner).contentType(MediaType.APPLICATION_JSON)
                .content("{\"expiresInHours\":1}"), 201);
        String token = share.get("token").asText();
        mvc.perform(get("/api/shared/" + token + "/photos/" + UUID.randomUUID())).andExpect(status().isNotFound());
        String anotherAlbum = result(auth(post("/api/albums"), owner).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Other\"}"), 201).get("id").asText();
        mvc.perform(auth(delete("/api/albums/" + anotherAlbum + "/shares/" + share.get("id").asText()), owner))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/shared/" + token).param("size", "101")).andExpect(status().isBadRequest());
    }

    @Test
    void simultaneousRefreshRequestsCanConsumeATokenOnlyOnce() throws Exception {
        Session owner = register();
        var ready = new java.util.concurrent.CountDownLatch(1);
        try (var pool = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            java.util.concurrent.Callable<Integer> refresh = () -> {
                ready.await();
                return mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("refreshToken", owner.refresh())))).andReturn().getResponse().getStatus();
            };
            var first = pool.submit(refresh); var second = pool.submit(refresh);
            ready.countDown();
            var statuses = new ArrayList<>(List.of(first.get(20, java.util.concurrent.TimeUnit.SECONDS), second.get(20, java.util.concurrent.TimeUnit.SECONDS)));
            Collections.sort(statuses);
            assertEquals(List.of(200, 401), statuses);
        }
    }

    @Test
    void simultaneousUploadsCannotBypassDuplicateDetection() throws Exception {
        Session owner = register();
        var ready = new java.util.concurrent.CountDownLatch(1);
        try (var pool = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            java.util.concurrent.Callable<Integer> upload = () -> {
                ready.await();
                return mvc.perform(auth(multipart("/api/photos/upload")
                        .file(new MockMultipartFile("file", "same.png", "image/png", IMAGE)), owner)).andReturn().getResponse().getStatus();
            };
            var first = pool.submit(upload); var second = pool.submit(upload);
            ready.countDown();
            var statuses = new ArrayList<>(List.of(first.get(20, java.util.concurrent.TimeUnit.SECONDS), second.get(20, java.util.concurrent.TimeUnit.SECONDS)));
            Collections.sort(statuses);
            assertEquals(List.of(201, 409), statuses);
            verify(imagekit).uploadPhoto(any(User.class), any(MultipartFile.class));
        }
    }

    @Test
    void metadataImportUsesProviderVerifiedValuesAndRejectsRepeatedImports() throws Exception {
        Session owner = register();
        var file = io.imagekit.models.files.File.builder().fileId("verified-" + UUID.randomUUID()).name("verified.png")
                .url("https://ik.imagekit.io/test/verified.png").size(42.0).mime("image/png").build();
        when(imagekit.listAssetsInFolder(eq(ImageKitService.userFolder(UUID.fromString(owner.userId()))), anyLong(), anyLong()))
                .thenReturn(List.of(io.imagekit.models.assets.AssetListResponse.ofFile(file)));
        var payload = Map.of("imagekitFileId", file.fileId().orElseThrow(), "fileName", "spoofed.png",
                "url", "https://untrusted.example/file.png", "sizeBytes", 1);
        mvc.perform(auth(post("/api/photos"), owner).contentType(MediaType.APPLICATION_JSON).content(body(payload)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.fileName").value("verified.png"))
                .andExpect(jsonPath("$.url").value("https://ik.imagekit.io/test/verified.png"));
        performJson(owner, "/api/photos", payload, 409);
        mvc.perform(auth(get("/api/photos/memories"), owner)).andExpect(status().isOk());
    }

    private Session register() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        JsonNode node = result(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email, "password", "StrongPass123!", "displayName", "Test user"))), 201);
        return new Session(node.get("accessToken").asText(), node.get("refreshToken").asText(), node.get("user").get("id").asText(), email);
    }
    private JsonNode upload(Session owner, String name, byte[] data, boolean allowDuplicate, int expected) throws Exception {
        return result(auth(multipart("/api/photos/upload").file(new MockMultipartFile("file", name, "image/png", data))
                .param("allowDuplicate", String.valueOf(allowDuplicate)), owner), expected);
    }
    private <B extends org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder<B>> B auth(B request, Session owner) {
        return owner == null ? request : request.header("Authorization", "Bearer " + owner.token());
    }
    private void performJson(Session owner, String path, Object payload, int expected) throws Exception {
        result(auth(post(path), owner).contentType(MediaType.APPLICATION_JSON).content(body(payload)), expected);
    }
    private JsonNode result(org.springframework.test.web.servlet.RequestBuilder request, int expected) throws Exception {
        String response = mvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return response.isBlank() ? null : json.readTree(response);
    }
    private String body(Object value) { return json.writeValueAsString(value); }
}

