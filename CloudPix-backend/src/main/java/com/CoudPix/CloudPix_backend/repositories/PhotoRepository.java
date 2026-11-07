package com.CoudPix.CloudPix_backend.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.CoudPix.CloudPix_backend.domain.Photo;
import com.CoudPix.CloudPix_backend.dto.PhotoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;



public interface PhotoRepository extends JpaRepository<Photo, UUID>, JpaSpecificationExecutor<Photo> {
    List<Photo> findByUserIdAndContentHash(UUID userId, String contentHash);

    @Query("select distinct tag from Photo p join p.tags tag where p.user.id = :userId order by tag")
    List<String> findTags(UUID userId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :userId")
    com.CoudPix.CloudPix_backend.domain.User lockUploadOwner(UUID userId);

    @Query("""
            select p from Photo p where p.user.id = :userId and p.status <> 'TRASH'
            and p.contentHash in (select d.contentHash from Photo d
            where d.user.id = :userId and d.status <> 'TRASH' and d.contentHash is not null
            group by d.contentHash having count(d) > 1)
            """)
    Page<Photo> findDuplicates(UUID userId, Pageable pageable);

    @Query("""
            select p from Photo p where p.user.id = :userId and p.status = 'ACTIVE'
            and extract(month from p.createdAt) = :month and extract(day from p.createdAt) = :day
            and extract(year from p.createdAt) < :year
            """)
    Page<Photo> findMemories(UUID userId, int month, int day, int year, Pageable pageable);
    Page<Photo> findByUserIdAndStatus(UUID userId, PhotoStatus status, Pageable pageable);

    List<Photo> findByIdInAndUserId(List<UUID> ids, UUID userId);

    Optional<Photo> findByIdAndUserId(UUID id, UUID userId);

    Optional<Photo> findByIdAndUserIdAndStatus(UUID id, UUID userId, PhotoStatus status);

    boolean existsByImagekitFileIdAndUserId(String imagekitFileId, UUID userId);

    long countByUserIdAndStatus(UUID userId, PhotoStatus status);

    long countByUserIdAndFavoriteTrueAndStatus(UUID userId, PhotoStatus status);

    long countByUserIdAndAiTransformTypeIsNotNullAndStatus(UUID userId, PhotoStatus status);

    List<Photo> findTop6ByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, PhotoStatus status);

    @Query("""
            SELECT p.mimeType, COUNT(p)
            FROM Photo p
            WHERE p.user.id = :userId AND p.status = 'ACTIVE' AND p.mimeType IS NOT NULL
            GROUP BY p.mimeType
            """)
    List<Object[]> countByMimeType(UUID userId);

    @Query("""
            SELECT p FROM Photo p
            WHERE p.user.id = :userId AND p.status = 'ACTIVE' AND p.createdAt >= :since
            ORDER BY p.createdAt ASC
            """)
    List<Photo> findActivePhotosSince(UUID userId, java.time.Instant since);

    @Query("""
            SELECT COALESCE(SUM(p.sizeBytes), 0)
            FROM Photo p
            WHERE p.user.id = :userId AND p.status = :status
            """)
    long sumActivePhotoBytesByUserId(UUID userId, PhotoStatus status);

    default long sumActivePhotoBytesByUserId(UUID userId) {
        return sumActivePhotoBytesByUserId(userId, PhotoStatus.ACTIVE);
    }
}
