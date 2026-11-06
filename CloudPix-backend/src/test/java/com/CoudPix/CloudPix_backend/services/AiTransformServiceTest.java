package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.*;
import com.CoudPix.CloudPix_backend.dto.*;
import com.CoudPix.CloudPix_backend.exception.*;
import com.CoudPix.CloudPix_backend.repositories.PhotoRepository;
import io.imagekit.models.files.FileUploadResponse;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AiTransformServiceTest {
    private final PhotoRepository photos = mock(PhotoRepository.class);
    private final ImageKitService images = mock(ImageKitService.class);
    private final PhotoService photoService = mock(PhotoService.class);
    private final AiTransformService service = new AiTransformService(photos, images, photoService);
    private final User owner = User.builder().id(UUID.randomUUID()).build();
    private final Photo photo = Photo.builder().id(UUID.randomUUID()).user(owner).fileName("portrait.jpg")
            .url("https://ik.imagekit.io/test/portrait.jpg").status(PhotoStatus.ACTIVE).build();

    static Stream<Arguments> transformations() {
        return Stream.of(
            Arguments.of(AiTransformType.REMOVE_BACKGROUND, null, null, null, null, "e-bgremove"),
            Arguments.of(AiTransformType.BACKGROUND_AND_SHADOW, null, null, null, null, "e-bgremove:e-dropshadow"),
            Arguments.of(AiTransformType.CHANGE_BACKGROUND, "blue sky", null, null, null, "e-changebg-prompt-blue+sky"),
            Arguments.of(AiTransformType.GENERATIVE_FILL, null, 64, 4096, null, "bg-genfill,w-64,h-4096,cm-pad_resize"),
            Arguments.of(AiTransformType.GENERATIVE_FILL, "blue sky", 300, 200, null, "bg-genfill-prompt-blue+sky,w-300,h-200,cm-pad_resize"),
            Arguments.of(AiTransformType.SMART_CROP, null, 300, 200, null, "w-300,h-200,fo-auto"),
            Arguments.of(AiTransformType.OBJECT_CROP, null, null, null, " Dog! ", "fo-dog"),
            Arguments.of(AiTransformType.RETOUCH, null, null, null, null, "e-retouch"),
            Arguments.of(AiTransformType.UPSCALE, null, null, null, null, "e-upscale"),
            Arguments.of(AiTransformType.AI_EDIT, "bright light", null, null, null, "e-edit-prompt-bright+light")
        );
    }

    @ParameterizedTest @MethodSource("transformations")
    void generatesSupportedImageKitTransformations(AiTransformType type, String prompt, Integer width,
            Integer height, String object, String expected) {
        assertEquals(expected, service.buildTransformChain(new AiTransformRequest(type, prompt, width, height, object), photo));
    }

    static Stream<AiTransformRequest> invalidRequests() {
        return Stream.of(
            new AiTransformRequest(AiTransformType.CHANGE_BACKGROUND, null, null, null, null),
            new AiTransformRequest(AiTransformType.AI_EDIT, " ", null, null, null),
            new AiTransformRequest(AiTransformType.SMART_CROP, null, null, 200, null),
            new AiTransformRequest(AiTransformType.SMART_CROP, null, 63, 200, null),
            new AiTransformRequest(AiTransformType.GENERATIVE_FILL, null, 4097, 200, null),
            new AiTransformRequest(AiTransformType.GENERATIVE_FILL, null, 200, 63, null),
            new AiTransformRequest(AiTransformType.OBJECT_CROP, null, null, null, null),
            new AiTransformRequest(AiTransformType.OBJECT_CROP, null, null, null, " "),
            new AiTransformRequest(AiTransformType.OBJECT_CROP, null, null, null, "!!!")
        );
    }

    @ParameterizedTest @MethodSource("invalidRequests")
    void rejectsInvalidTransformationInputsBeforeCallingProvider(AiTransformRequest request) {
        assertThrows(BadRequestException.class, () -> service.buildTransformChain(request, photo));
        verifyNoInteractions(images);
    }

    @Test
    void previewDoesNotUploadOrSaveAResult() {
        when(photos.findByIdAndUserIdAndStatus(photo.getId(), owner.getId(), PhotoStatus.ACTIVE)).thenReturn(Optional.of(photo));
        when(images.buildAiTransformUrl(photo.getUrl(), "e-retouch")).thenReturn("https://ik.imagekit.io/test/preview.jpg");
        var response = service.preview(owner, photo.getId(), new AiTransformRequest(AiTransformType.RETOUCH, null, null, null, null));
        assertEquals("https://ik.imagekit.io/test/preview.jpg", response.previewUrl());
        assertEquals(AiTransformType.RETOUCH, response.type());
        verifyNoInteractions(photoService);
        verify(images, never()).uploadBytes(any(), any(), any());
    }

    @ParameterizedTest @ValueSource(strings = {"portrait.jpg", "portrait"})
    void applySavesADerivativeWithTheRightFilenameAndParent(String filename) {
        photo.setFileName(filename);
        when(photos.findByIdAndUserIdAndStatus(photo.getId(), owner.getId(), PhotoStatus.ACTIVE)).thenReturn(Optional.of(photo));
        byte[] bytes = { 1, 2, 3 };
        when(images.buildAiTransformUrl(anyString(), anyString())).thenReturn("https://ik.imagekit.io/test/result");
        when(images.downloadTransformedImage(anyString())).thenReturn(bytes);
        var uploaded = FileUploadResponse.builder().fileId("derived").url("https://ik.imagekit.io/test/derived.png").build();
        when(images.uploadBytes(eq(owner), eq(bytes), anyString())).thenReturn(uploaded);
        var expected = mock(PhotoResponse.class);
        when(photoService.createDerivedPhoto(owner, photo, uploaded, AiTransformType.RETOUCH)).thenReturn(expected);
        assertSame(expected, service.apply(owner, photo.getId(), new AiTransformRequest(AiTransformType.RETOUCH, null, null, null, null)));
        verify(images).uploadBytes(owner, bytes, filename.contains(".") ? "portrait-ai-retouch.jpg" : "portrait-ai-retouch.png");
    }

    @Test
    void missingOrInactivePhotoNeverReachesTheProvider() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.preview(owner, UUID.randomUUID(), new AiTransformRequest(AiTransformType.RETOUCH, null, null, null, null)));
        verifyNoInteractions(images, photoService);
    }
}

