package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.*;
import com.CoudPix.CloudPix_backend.exception.*;
import com.CoudPix.CloudPix_backend.repositories.*;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

@Service
public class PhotoDownloadService {
    private static final long MAX_DOWNLOAD_BYTES = 1024L * 1024 * 1024;
    private final PhotoRepository photos;
    private final AlbumRepository albums;
    private final AlbumPhotoRepository members;
    private final ImageDownloadClient images;

    public PhotoDownloadService(PhotoRepository photos, AlbumRepository albums,
            AlbumPhotoRepository members, ImageDownloadClient images) {
        this.photos = photos; this.albums = albums; this.members = members; this.images = images;
    }

    @Transactional(readOnly = true)
    public ResponseEntity<InputStreamResource> photo(User user, UUID id) {
        Photo photo = photos.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
        if (photo.getStatus() == com.CoudPix.CloudPix_backend.dto.PhotoStatus.TRASH)
            throw new BadRequestException("Restore the photo before downloading");
        return response(images.open(photo.getUrl()), safeName(photo.getFileName()), MediaType.APPLICATION_OCTET_STREAM);
    }

    @Transactional(readOnly = true)
    public ResponseEntity<InputStreamResource> album(User user, UUID id) {
        Album album = albums.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Album not found"));
        long count = albums.countPhotosByAlbumId(id);
        if (count == 0) throw new BadRequestException("The album has no active photos");
        if (count > 500) throw new BadRequestException("Download is limited to 500 photos per album");
        var entries = members.findByAlbumIdAndUserId(id, user.getId(),
                org.springframework.data.domain.PageRequest.of(0, 500)).getContent();
        Path temporary = null;
        try {
            temporary = Files.createTempFile("cloudpix-album-", ".zip");
            long total = 0;
            try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(temporary))) {
                for (int i = 0; i < entries.size(); i++) {
                    Photo photo = entries.get(i).getPhoto();
                    zip.putNextEntry(new ZipEntry(String.format("%03d-%s", i + 1, safeName(photo.getFileName()))));
                    try (InputStream input = images.open(photo.getUrl())) {
                        byte[] bytes = new byte[8192];
                        int read;
                        while ((read = input.read(bytes)) != -1) {
                            total += read;
                            if (total > MAX_DOWNLOAD_BYTES) throw new BadRequestException("Album download exceeds the 1 GB limit");
                            zip.write(bytes, 0, read);
                        }
                    }
                    zip.closeEntry();
                }
            }
            Path completed = temporary;
            InputStream input = new FilterInputStream(Files.newInputStream(completed)) {
                @Override public void close() throws IOException {
                    try { super.close(); } finally { Files.deleteIfExists(completed); }
                }
            };
            return response(input, safeName(album.getTitle()) + ".zip", MediaType.parseMediaType("application/zip"));
        } catch (IOException | RuntimeException ex) {
            if (temporary != null) try { Files.deleteIfExists(temporary); } catch (IOException ignored) {}
            if (ex instanceof RuntimeException runtime) throw runtime;
            throw new ImageKitUploadException("Could not prepare album download");
        }
    }

    private ResponseEntity<InputStreamResource> response(InputStream input, String name, MediaType type) {
        return ResponseEntity.ok().contentType(type).cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(name, StandardCharsets.UTF_8).build().toString())
                .body(new InputStreamResource(input));
    }

    static String safeName(String name) {
        String result = name == null ? "photo" : name.replaceAll("[\\\\/\\p{Cntrl}:*?\"<>|]", "_");
        if (result.isBlank() || result.equals(".") || result.equals("..")) return "photo";
        return result.substring(0, Math.min(result.length(), 180));
    }
}

