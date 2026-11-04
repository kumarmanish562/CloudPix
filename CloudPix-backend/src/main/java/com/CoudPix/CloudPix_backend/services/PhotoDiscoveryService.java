package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.*;
import com.CoudPix.CloudPix_backend.dto.*;
import com.CoudPix.CloudPix_backend.exception.*;
import com.CoudPix.CloudPix_backend.repositories.PhotoRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.Predicate;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PhotoDiscoveryService {
    private final PhotoRepository photos;
    private final PhotoService photoService;

    public PhotoDiscoveryService(PhotoRepository photos, PhotoService photoService) {
        this.photos = photos;
        this.photoService = photoService;
    }

    public static Pageable page(int page, int size, String sort) {
        if (page < 0 || size < 1 || size > 100) throw new BadRequestException("Page must be nonnegative and size between 1 and 100");
        Sort order = switch (sort) {
            case "newest" -> Sort.by(Sort.Direction.DESC, "createdAt");
            case "oldest" -> Sort.by(Sort.Direction.ASC, "createdAt");
            case "name" -> Sort.by("fileName");
            case "size" -> Sort.by(Sort.Direction.DESC, "sizeBytes");
            default -> throw new BadRequestException("Sort must be newest, oldest, name, or size");
        };
        return PageRequest.of(page, size, order.and(Sort.by("id")));
    }

    public static Pageable albumPage(int page, int size) {
        page(page, size, "newest"); // Validate bounds; album queries define their own membership ordering.
        return PageRequest.of(page, size);
    }

    public PageResponse<PhotoResponse> search(User user, PhotoStatus status, String q, String tag,
            Boolean favorite, String mimeType, Instant from, Instant to, Pageable pageable) {
        if (q.length() > 200 || tag.length() > 50) throw new BadRequestException("Search text is too long");
        if (from != null && to != null && !from.isBefore(to)) throw new BadRequestException("From must be before to");
        Specification<Photo> spec = (root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            filters.add(cb.equal(root.get("user").get("id"), user.getId()));
            filters.add(cb.equal(root.get("status"), status));
            if (!q.isBlank()) {
                String pattern = "%" + escape(q.trim().toLowerCase(Locale.ROOT)) + "%";
                // Subquery keeps each photo unique, including when multiple tags match.
                var tags = query.subquery(UUID.class);
                var taggedPhoto = tags.from(Photo.class);
                var value = taggedPhoto.join("tags");
                tags.select(taggedPhoto.get("id")).where(cb.like(cb.lower(value.as(String.class)), pattern, '\\'));
                filters.add(cb.or(cb.like(cb.lower(root.get("fileName")), pattern, '\\'), root.get("id").in(tags)));
            }
            if (!tag.isBlank()) filters.add(cb.isMember(tag.trim().toLowerCase(Locale.ROOT), root.get("tags")));
            if (favorite != null) filters.add(cb.equal(root.get("favorite"), favorite));
            if (mimeType != null && !mimeType.isBlank()) filters.add(cb.equal(root.get("mimeType"), mimeType));
            if (from != null) filters.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null) filters.add(cb.lessThan(root.get("createdAt"), to));
            return cb.and(filters.toArray(Predicate[]::new));
        };
        return response(photos.findAll(spec, pageable));
    }

    @Transactional
    public PhotoResponse update(User user, UUID id, UpdatePhotoRequest request) {
        Photo photo = photos.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
        if (request.favorite() != null) photo.setFavorite(request.favorite());
        if (request.tags() != null) {
            Set<String> normalized = request.tags().stream().map(t -> t.trim().toLowerCase(Locale.ROOT))
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            if (normalized.contains("")) throw new BadRequestException("Tags cannot be blank");
            photo.getTags().clear();
            photo.getTags().addAll(normalized);
        }
        return photoService.toPhotoResponse(photo);
    }

    public List<String> tags(User user) {
        // Returns tags only from the owner's photos.
        return photos.findTags(user.getId());
    }

    public PageResponse<PhotoResponse> duplicates(User user, Pageable pageable) {
        return response(photos.findDuplicates(user.getId(), pageable));
    }

    public PageResponse<PhotoResponse> memories(User user, LocalDate date, Pageable pageable) {
        return response(photos.findMemories(user.getId(), date.getMonthValue(), date.getDayOfMonth(), date.getYear(), pageable));
    }

    private PageResponse<PhotoResponse> response(Page<Photo> page) {
        return new PageResponse<>(page.map(photoService::toPhotoResponse).getContent(), page.getNumber(),
                page.getSize(), page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    private static String escape(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}

