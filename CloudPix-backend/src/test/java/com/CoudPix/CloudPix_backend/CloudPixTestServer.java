package com.CoudPix.CloudPix_backend;

import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.services.*;
import io.imagekit.models.files.FileUploadResponse;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.RouterFunctions;
import org.springframework.web.servlet.function.ServerResponse;
import java.io.ByteArrayInputStream;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Test classpath only: real backend with in-memory media for browser automation. */
public class CloudPixTestServer {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(CloudPixBackendApplication.class, Media.class);
        app.setAdditionalProfiles("test");
        app.run(args);
    }

    @TestConfiguration
    static class Media {
        @Bean @Primary
        ImageKitService browserTestImageKit() {
            ImageKitService service = mock(ImageKitService.class);
            when(service.uploadPhoto(any(User.class), any(MultipartFile.class))).thenAnswer(invocation -> {
                MultipartFile file = invocation.getArgument(1);
                return uploaded(file.getOriginalFilename(), file.getBytes());
            });
            when(service.uploadBytes(any(User.class), any(byte[].class), anyString())).thenAnswer(invocation ->
                    uploaded(invocation.getArgument(2), invocation.getArgument(1)));
            when(service.listAssetsInFolder(anyString(), anyLong(), anyLong())).thenReturn(List.of());
            when(service.buildThumbnailUrlFromUrl(anyString())).thenAnswer(invocation -> invocation.getArgument(0));
            when(service.buildAiTransformUrl(anyString(), anyString())).thenAnswer(invocation -> invocation.getArgument(0));
            when(service.downloadTransformedImage(anyString())).thenAnswer(invocation -> bytes(invocation.getArgument(0)));
            return service;
        }

        @Bean @Primary
        ImageDownloadClient browserTestDownloads() {
            ImageDownloadClient client = mock(ImageDownloadClient.class);
            when(client.open(anyString())).thenAnswer(invocation -> new ByteArrayInputStream(bytes(invocation.getArgument(0))));
            return client;
        }

        @Bean
        RouterFunction<ServerResponse> testHealth() {
            return RouterFunctions.route().GET("/api/shared/test-health", request -> ServerResponse.ok().body(Map.of("status", "UP"))).build();
        }

        private static FileUploadResponse uploaded(String name, byte[] bytes) {
            String url = "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes);
            return FileUploadResponse.builder().fileId(UUID.randomUUID().toString()).name(name)
                    .url(url).thumbnailUrl(url).size((double)bytes.length).width(1.0).height(1.0).build();
        }
        private static byte[] bytes(String url) { return Base64.getDecoder().decode(url.substring(url.indexOf(',') + 1)); }
    }
}

