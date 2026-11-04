package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.config.ImageKitProperties;
import com.CoudPix.CloudPix_backend.exception.*;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.*;
import java.io.*;
import java.time.Duration;

// Only fetch the configured image CDN. Metadata URLs cannot turn this into an arbitrary URL proxy.
@Component
public class ImageDownloadClient {
    private final URI endpoint;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NEVER).build();

    public ImageDownloadClient(ImageKitProperties properties) {
        endpoint = URI.create(properties.urlEndpoint().endsWith("/") ? properties.urlEndpoint() : properties.urlEndpoint() + "/");
    }

    public InputStream open(String url) {
        URI uri;
        try { uri = URI.create(url); }
        catch (RuntimeException ex) { throw new BadRequestException("Invalid image URL"); }
        String path = uri.normalize().getPath();
        if (!"https".equalsIgnoreCase(uri.getScheme()) || !endpoint.getHost().equalsIgnoreCase(uri.getHost())
                || effectivePort(uri) != effectivePort(endpoint) || uri.getUserInfo() != null
                || path == null || !path.startsWith(endpoint.getPath()) || path.contains("\\")
                || java.util.Arrays.stream(path.split("/")).anyMatch(segment -> segment.equals("..") || segment.equals(".")))
            throw new BadRequestException("Image URL is outside the configured image endpoint");
        try {
            var response = client.send(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(60)).GET().build(),
                    HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() != 200) {
                response.body().close();
                throw new ImageKitUploadException("Image download failed");
            }
            return response.body();
        } catch (IOException ex) { throw new ImageKitUploadException("Image download failed"); }
        catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ImageKitUploadException("Image download interrupted");
        }
    }

    private static int effectivePort(URI uri) { return uri.getPort() == -1 ? 443 : uri.getPort(); }
}

