package com.CoudPix.CloudPix_backend.dto;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;
import java.util.Set;

public record UpdatePhotoRequest(Boolean favorite,
        @Size(max = 20) Set<@NotBlank @Size(max = 50) String> tags) {}

