"use client";

import { Cloud } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useStorageUsage } from "@/hooks/use-library";
import { formatBytes } from "@/lib/format-bytes";

const DISPLAY_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

export function StorageWidget() {
  const { data, isLoading } = useStorageUsage();

  if (isLoading) {
    return <Skeleton className="mx-3 h-24 rounded-2xl" />;
  }

  if (!data) {
    return null;
  }

  const usedPercent = Math.min(100, (data.libraryUsedBytes / DISPLAY_QUOTA_BYTES) * 100);
  const formattedPercent = usedPercent < 1 && usedPercent > 0 ? "<1%" : `${Math.round(usedPercent)}%`;

  return (
    <div className="mx-2.5 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/30 p-3.5 shadow-2xs backdrop-blur-md transition-all hover:bg-sidebar-accent/45">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-sidebar-foreground">
          <Cloud className="size-3.5 text-primary" />
          <span>Cloud Storage</span>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {formattedPercent}
        </span>
      </div>

      <Progress value={usedPercent} className="mb-2.5 h-1.5 rounded-full bg-sidebar-border/60" />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatBytes(data.libraryUsedBytes)} used</span>
        <span>{data.libraryPhotoCount} photos</span>
      </div>
    </div>
  );
}
