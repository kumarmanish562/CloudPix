package com.CoudPix.CloudPix_backend.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record AddPhotosToAlbumRequest(
        @NotEmpty @jakarta.validation.constraints.Size(max = 100) List<@jakarta.validation.constraints.NotNull UUID> photoIds
) {
}
