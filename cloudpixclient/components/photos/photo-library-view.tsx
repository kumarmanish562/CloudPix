
"use client";

import { useState, useEffect } from "react";
import { CheckSquare, CloudDownload, Images, Sparkles } from "lucide-react";
import { ImportImageKitDialog } from "@/components/library/import-imagekit-dialog";
import { PhotoBulkToolbar } from "@/components/photos/photo-bulk-toolbar";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { PhotoUploadButton } from "@/components/photos/photo-upload-button";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { usePhotos } from "@/hooks/use-photos";
import type { PhotoStatus, PhotoFilters } from "@/lib/api";
import { PhotoFilterBar } from "@/components/photos/photo-filter-bar";
import { usePhotoSelectionStore } from "@/stores/photo-selection-store";

type PhotoLibraryViewProps = {
  title: string;
  description: string;
  status: PhotoStatus;
  emptyTitle: string;
  emptyDescription: string;
  showUpload?: boolean;
  showTrashAction?: boolean;
  favoriteOnly?: boolean;
};

export function PhotoLibraryView({
  title,
  description,
  status,
  emptyTitle,
  emptyDescription,
  showUpload = false,
  showTrashAction = false,
  favoriteOnly = false,
}: PhotoLibraryViewProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [filters, setFilters] = useState<PhotoFilters>({});
  const [debouncedFilters, setDebouncedFilters] = useState<PhotoFilters>({});
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);
  const { data, isLoading, isError, error, refetch, isFetchingNextPage, hasNextPage, fetchNextPage } = usePhotos(status, {
    ...debouncedFilters, ...(favoriteOnly ? { favorite: true } : {}),
  });
  const isSelectMode = usePhotoSelectionStore((state) => state.isSelectMode);
  const enterSelectMode = usePhotoSelectionStore((state) => state.enterSelectMode);
  const exitSelectMode = usePhotoSelectionStore((state) => state.exitSelectMode);
  useEffect(() => { exitSelectMode(); }, [filters, exitSelectMode]);

  const photos = data?.pages.flatMap((page) => page.content) ?? [];
  const photoIds = photos.map((photo) => photo.id);
  const totalPhotos = data?.pages[0]?.totalElements ?? 0;

  return (
    <div className="space-y-7">
      {status === "ACTIVE" && !favoriteOnly && (
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#241c3b] px-6 py-8 text-white shadow-xl shadow-violet-950/10 sm:px-9 sm:py-10">
          <div className="absolute -right-12 -top-28 -z-10 size-80 rounded-full bg-violet-500/30 blur-3xl" />
          <div className="absolute -bottom-36 right-1/3 -z-10 size-72 rounded-full bg-fuchsia-400/15 blur-3xl" />
          <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-violet-100">
                <Sparkles className="size-3.5" /> A little space for what matters
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your memories, in one place.</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/70 sm:text-base">
                Keep your favorite moments close, create collections, and give every photo room to shine.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {showUpload && <PhotoUploadButton />}
              {showUpload && (
                <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setImportOpen(true)}>
                  <CloudDownload className="size-4" /> Import photos
                </Button>
              )}
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 border-t border-white/10 pt-5 text-sm text-white/70">
            <Images className="size-4 text-violet-200" />
            <span>{totalPhotos} {totalPhotos === 1 ? "photo" : "photos"} in your library</span>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{status === "ACTIVE" && !favoriteOnly ? "Your photos" : title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalPhotos > 0
              ? `${totalPhotos} photo${totalPhotos === 1 ? "" : "s"}`
              : description}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {photos.length > 0 && (
            <Button
              variant="outline"
              onClick={() => (isSelectMode ? exitSelectMode() : enterSelectMode())}
            >
              <CheckSquare className="size-4" />
              {isSelectMode ? "Cancel selection" : "Select photos"}
            </Button>
          )}
        </div>
      </div>

      <ImportImageKitDialog open={importOpen} onOpenChange={setImportOpen} />

      <PhotoFilterBar filters={filters} onChange={setFilters} />

      <PhotoBulkToolbar photoIds={photoIds} context={status} />

      {isError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 p-5 text-sm">
          <p>{error.message}</p><Button variant="outline" onClick={() => refetch()} className="mt-3">Try again</Button>
        </div>
      ) : photos.length === 0 && !isLoading ? (
        <Empty className="border border-dashed border-border/80 bg-card/40">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckSquare />
            </EmptyMedia>
            <EmptyTitle>{Object.values(filters).some(Boolean) ? "No matching photos" : emptyTitle}</EmptyTitle>
            <EmptyDescription>{Object.values(filters).some(Boolean) ? "Try another search or clear your filters." : emptyDescription}</EmptyDescription>
          </EmptyHeader>
          {showUpload && (
            <EmptyContent>
              <PhotoUploadButton />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          <PhotoGrid
            photos={photos}
            isLoading={isLoading}
            selectable
            showTrashAction={showTrashAction && !isSelectMode}
          />

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Spinner />
                    Loading more...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
