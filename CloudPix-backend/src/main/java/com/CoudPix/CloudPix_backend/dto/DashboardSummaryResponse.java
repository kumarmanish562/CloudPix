package com.CoudPix.CloudPix_backend.dto;

import java.util.List;

public record DashboardSummaryResponse(
        long totalPhotos,
        long totalAlbums,
        long totalFavorites,
        long totalAiTransformed,
        long storageUsedBytes,
        long storageQuotaBytes,
        long activeShares,
        boolean emailVerified,
        List<UploadTrendDto> uploadTrends,
        List<FormatDistributionDto> formatDistribution,
        List<RecentPhotoDto> recentPhotos
) {
    public record UploadTrendDto(
            String date,
            long count,
            long bytes
    ) {}

    public record FormatDistributionDto(
            String format,
            long count,
            double percentage
    ) {}

    public record RecentPhotoDto(
            String id,
            String fileName,
            String url,
            String thumbnailUrl,
            String createdAt,
            String aiTransformType
    ) {}
}

