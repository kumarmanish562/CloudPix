"use client";

import Link from "next/link";
import Image from "next/image";
import { FolderOpen, Images } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import type { Album } from "@/lib/api";

type AlbumGridProps = {
  albums: Album[];
  isLoading?: boolean;
};

export function AlbumGrid({ albums, isLoading }: AlbumGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-[4/3] rounded-3xl" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/3 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {albums.map((album) => (
        <Link
          key={album.id}
          href={`/albums/${album.id}`}
          className="group relative flex flex-col transition-all duration-300 hover:-translate-y-1"
        >
          {/* Layered stack background illusion for rich feeling */}
          <div className="pointer-events-none absolute inset-x-2 -top-1.5 h-full rounded-3xl bg-muted/50 border border-border/40 opacity-70 transition-all duration-300 group-hover:-top-2 group-hover:scale-[1.02]" />

          {/* Main Card */}
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/5">
            <AspectRatio ratio={4 / 3} className="relative bg-muted/40 overflow-hidden">
              {album.coverThumbnailUrl ? (
                <Image
                  src={album.coverThumbnailUrl}
                  alt={album.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted/60 to-muted/20 text-muted-foreground">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-background/60 shadow-inner">
                    <FolderOpen className="size-7 opacity-60 text-primary" />
                  </div>
                  <span className="text-xs font-medium opacity-60">Empty album</span>
                </div>
              )}

              {/* Floating count badge */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white shadow-md backdrop-blur-md">
                <Images className="size-3 text-white/80" />
                <span>{album.photoCount}</span>
              </div>
            </AspectRatio>

            {/* Content metadata */}
            <div className="space-y-1 p-4 bg-gradient-to-b from-card to-card/90">
              <h3 className="truncate font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                {album.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {album.photoCount === 0 ? "No photos yet" : `${album.photoCount} photo${album.photoCount === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
