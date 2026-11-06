"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, Heart } from "lucide-react";
import { useUpdatePhoto } from "@/hooks/use-photos";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useRemovePhotoFromAlbum } from "@/hooks/use-albums";
import { useTrashPhotos } from "@/hooks/use-photos";
import type { Photo } from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePhotoSelectionStore } from "@/stores/photo-selection-store";

type PhotoGridProps = {
  photos: Photo[];
  isLoading?: boolean;
  selectable?: boolean;
  showTrashAction?: boolean;
  albumId?: string;
};

export function PhotoGrid({
  photos,
  isLoading,
  selectable = false,
  showTrashAction = false,
  albumId,
}: PhotoGridProps) {
  const trashMutation = useTrashPhotos();
  const updateMutation = useUpdatePhoto();
  const removeFromAlbumMutation = useRemovePhotoFromAlbum(albumId ?? "");
  const isSelectMode = usePhotoSelectionStore((state) => state.isSelectMode);
  const selectedIds = usePhotoSelectionStore((state) => state.selectedIds);
  const togglePhoto = usePhotoSelectionStore((state) => state.togglePhoto);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {photos.map((photo) => {
        const isSelected = selectedIds.includes(photo.id);

        return (
          <article
            key={photo.id}
            className={cn(
              "group relative overflow-hidden rounded-3xl bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
              isSelected
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "border border-border/70 hover:border-primary/40",
            )}
          >
            <AspectRatio ratio={1} className="bg-muted/30">
              <Image
                src={photo.thumbnailUrl ?? photo.url}
                alt={photo.fileName}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1280px) 25vw, 20vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
              />
            </AspectRatio>

            {/* Gradient overlay with caption */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-6 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <p className="truncate text-xs font-medium text-white">{photo.fileName}</p>
              {photo.width && photo.height && (
                <p className="text-[10px] text-white/70">
                  {photo.width} × {photo.height}
                </p>
              )}
            </div>

            {!isSelectMode && (
              <Link
                href={`/photos/${photo.id}`}
                className="absolute inset-0 z-10"
                aria-label={`Open ${photo.fileName}`}
              />
            )}

            {/* Favorite button */}
            {!isSelectMode && (
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute left-2.5 top-2.5 z-20 rounded-full border border-white/20 bg-background/80 shadow-xs backdrop-blur-md transition-all hover:bg-background"
                aria-label={
                  photo.favorite
                    ? `Remove ${photo.fileName} from favorites`
                    : `Favorite ${photo.fileName}`
                }
                aria-pressed={photo.favorite}
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: photo.id, favorite: !photo.favorite })}
              >
                <Heart
                  className={cn(
                    "size-4 transition-transform active:scale-125",
                    photo.favorite
                      ? "fill-rose-500 text-rose-500"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
              </Button>
            )}

            {/* Selection Checkbox */}
            {selectable && isSelectMode && (
              <div
                role="button"
                tabIndex={0}
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={() => togglePhoto(photo.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    togglePhoto(photo.id);
                  }
                }}
                aria-label={`Select ${photo.fileName}`}
              >
                <div className="pointer-events-none absolute left-3 top-3">
                  <Checkbox checked={isSelected} className="rounded-md bg-background/90 shadow-md" />
                </div>
              </div>
            )}

            {/* Move to trash action */}
            {showTrashAction && !isSelectMode && (
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                className="absolute right-2.5 top-2.5 z-20 rounded-full shadow-md transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                disabled={trashMutation.isPending}
                onClick={() => trashMutation.mutate([photo.id])}
                aria-label={`Move ${photo.fileName} to trash`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}

            {/* Remove from album action */}
            {albumId && !isSelectMode && (
              <Button
                type="button"
                variant="secondary"
                size="icon-xs"
                className="absolute right-2.5 top-2.5 z-20 rounded-full bg-background/80 shadow-md backdrop-blur-md transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                disabled={removeFromAlbumMutation.isPending}
                onClick={() => removeFromAlbumMutation.mutate(photo.id)}
                aria-label={`Remove ${photo.fileName} from album`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </article>
        );
      })}
    </div>
  );
}
