package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.domain.Photo;
import com.CoudPix.CloudPix_backend.domain.User;
import com.CoudPix.CloudPix_backend.dto.DashboardSummaryResponse;
import com.CoudPix.CloudPix_backend.dto.DashboardSummaryResponse.FormatDistributionDto;
import com.CoudPix.CloudPix_backend.dto.DashboardSummaryResponse.RecentPhotoDto;
import com.CoudPix.CloudPix_backend.dto.DashboardSummaryResponse.UploadTrendDto;
import com.CoudPix.CloudPix_backend.dto.PhotoStatus;
import com.CoudPix.CloudPix_backend.exception.UnauthorizedException;
import com.CoudPix.CloudPix_backend.repositories.AlbumRepository;
import com.CoudPix.CloudPix_backend.repositories.AlbumShareRepository;
import com.CoudPix.CloudPix_backend.repositories.PhotoRepository;
import com.CoudPix.CloudPix_backend.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final long DEFAULT_QUOTA_BYTES = 5L * 1024 * 1024 * 1024; // 5 GB

    private final PhotoRepository photoRepository;
    private final AlbumRepository albumRepository;
    private final AlbumShareRepository albumShareRepository;
    private final UserRepository userRepository;

    public DashboardService(
            PhotoRepository photoRepository,
            AlbumRepository albumRepository,
            AlbumShareRepository albumShareRepository,
            UserRepository userRepository
    ) {
        this.photoRepository = photoRepository;
        this.albumRepository = albumRepository;
        this.albumShareRepository = albumShareRepository;
        this.userRepository = userRepository;
    }

    public DashboardSummaryResponse getDashboardSummary(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        long totalPhotos = photoRepository.countByUserIdAndStatus(userId, PhotoStatus.ACTIVE);
        long totalAlbums = albumRepository.countByUserId(userId);
        long totalFavorites = photoRepository.countByUserIdAndFavoriteTrueAndStatus(userId, PhotoStatus.ACTIVE);
        long totalAiTransformed = photoRepository.countByUserIdAndAiTransformTypeIsNotNullAndStatus(userId, PhotoStatus.ACTIVE);
        long storageUsedBytes = photoRepository.sumActivePhotoBytesByUserId(userId);
        long activeShares = albumShareRepository.countActiveSharesByUserId(userId);

        List<UploadTrendDto> uploadTrends = calculateUploadTrends(userId);
        List<FormatDistributionDto> formatDistribution = calculateFormatDistribution(userId, totalPhotos);
        List<RecentPhotoDto> recentPhotos = getRecentPhotos(userId);

        return new DashboardSummaryResponse(
                totalPhotos,
                totalAlbums,
                totalFavorites,
                totalAiTransformed,
                storageUsedBytes,
                DEFAULT_QUOTA_BYTES,
                activeShares,
                user.isEmailVerified(),
                uploadTrends,
                formatDistribution,
                recentPhotos
        );
    }

    private List<UploadTrendDto> calculateUploadTrends(UUID userId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        Map<String, long[]> dayStats = new LinkedHashMap<>();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");
        DateTimeFormatter keyFormatter = DateTimeFormatter.ISO_LOCAL_DATE;

        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            dayStats.put(date.format(keyFormatter), new long[]{0, 0});
        }

        Instant sevenDaysAgo = today.minusDays(6).atStartOfDay().toInstant(ZoneOffset.UTC);
        List<Photo> recentPhotos = photoRepository.findActivePhotosSince(userId, sevenDaysAgo);

        for (Photo photo : recentPhotos) {
            String dayKey = photo.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate().format(keyFormatter);
            long[] stats = dayStats.get(dayKey);
            if (stats != null) {
                stats[0]++;
                stats[1] += photo.getSizeBytes();
            }
        }

        List<UploadTrendDto> result = new ArrayList<>();
        for (Map.Entry<String, long[]> entry : dayStats.entrySet()) {
            LocalDate d = LocalDate.parse(entry.getKey(), keyFormatter);
            result.add(new UploadTrendDto(
                    d.format(formatter),
                    entry.getValue()[0],
                    entry.getValue()[1]
            ));
        }

        return result;
    }

    private List<FormatDistributionDto> calculateFormatDistribution(UUID userId, long totalPhotos) {
        if (totalPhotos == 0) {
            return List.of();
        }

        List<Object[]> rows = photoRepository.countByMimeType(userId);
        List<FormatDistributionDto> result = new ArrayList<>();

        for (Object[] row : rows) {
            String mime = (String) row[0];
            long count = ((Number) row[1]).longValue();
            String formatName = mime.replace("image/", "").toUpperCase(Locale.ROOT);
            double pct = Math.round((double) count / totalPhotos * 1000.0) / 10.0;
            result.add(new FormatDistributionDto(formatName, count, pct));
        }

        result.sort((a, b) -> Long.compare(b.count(), a.count()));
        return result;
    }

    private List<RecentPhotoDto> getRecentPhotos(UUID userId) {
        List<Photo> photos = photoRepository.findTop6ByUserIdAndStatusOrderByCreatedAtDesc(userId, PhotoStatus.ACTIVE);
        return photos.stream()
                .map(p -> new RecentPhotoDto(
                        p.getId().toString(),
                        p.getFileName(),
                        p.getUrl(),
                        p.getThumbnailUrl() != null ? p.getThumbnailUrl() : p.getUrl(),
                        p.getCreatedAt().toString(),
                        p.getAiTransformType()
                ))
                .toList();
    }
}

