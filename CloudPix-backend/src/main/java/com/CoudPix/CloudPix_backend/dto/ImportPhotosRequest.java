package com.CoudPix.CloudPix_backend.dto;


import java.util.List;

import jakarta.validation.constraints.NotEmpty;

public record ImportPhotosRequest(
        @NotEmpty @jakarta.validation.constraints.Size(max = 100) List<@jakarta.validation.constraints.NotBlank String> imagekitFileIds
) {
}
