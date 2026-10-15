package com.CoudPix.CloudPix_backend.dto;


import java.util.List;

import jakarta.validation.constraints.NotEmpty;

public record ImportPhotosRequest(
        @NotEmpty List<String> imagekitFileIds
) {
}
