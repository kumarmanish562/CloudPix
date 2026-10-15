package com.CoudPix.CloudPix_backend.controllers;

import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.AiTransformPreviewResponse;
import com.CoudPix.CloudPix_backend.dto.AiTransformRequest;
import com.CoudPix.CloudPix_backend.dto.PhotoResponse;
import com.CoudPix.CloudPix_backend.services.AiTransformService;
import com.CoudPix.CloudPix_backend.services.UserService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.UUID;
import jakarta.validation.Valid;



@RestController
@RequestMapping("/api/photos/{photoId}/ai")
public class PhotoAiController {

    private final AiTransformService aiTransformService;
    private final UserService userService;

    public PhotoAiController(AiTransformService aiTransformService, UserService userService) {
        this.aiTransformService = aiTransformService;
        this.userService = userService;
    }

    @PostMapping("/preview")
    public ResponseEntity<AiTransformPreviewResponse> preview(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID photoId,
            @Valid @RequestBody AiTransformRequest request
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        return ResponseEntity.ok(aiTransformService.preview(user, photoId, request));
    }

    @PostMapping("/apply")
    public ResponseEntity<PhotoResponse> apply(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID photoId,
            @Valid @RequestBody AiTransformRequest request
    ) {
        User user = userService.getByEmail(userDetails.getUsername());
        PhotoResponse photo = aiTransformService.apply(user, photoId, request);
        return ResponseEntity.ok(photo);
    }
}