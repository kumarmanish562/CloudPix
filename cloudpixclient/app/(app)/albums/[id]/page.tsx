"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Images, Trash2 } from "lucide-react";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useAlbum, useAlbumPhotos, useDeleteAlbum } from "@/hooks/use-albums";
import { ShareAlbumDialog } from "@/components/albums/share-album-dialog";
import { DownloadButton } from "@/components/photos/download-button";

export default function AlbumDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const albumId = params.id;
  const { data: album, isLoading: albumLoading } = useAlbum(albumId);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useAlbumPhotos(albumId);
  const deleteAlbumMutation = useDeleteAlbum();

  const photos = data?.pages.flatMap((page) => page.content) ?? [];
  const totalPhotos = data?.pages[0]?.totalElements ?? album?.photoCount ?? 0;

  if (albumLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-6 text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading collection...</span>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <p className="text-base font-semibold text-destructive">Album not found</p>
        <p className="mt-1 text-xs text-muted-foreground">The album may have been deleted or the link is invalid.</p>
        <div className="mt-4">
          <Link href="/albums">
            <Button variant="outline" size="sm" className="rounded-full">
              Back to albums
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div className="space-y-2">
          <Link
            href="/albums"
            className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs backdrop-blur-md transition-all hover:border-primary/40 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>All albums</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {album.title}
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {totalPhotos} {totalPhotos === 1 ? "photo" : "photos"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ShareAlbumDialog albumId={albumId} />
          <DownloadButton
            path={`/albums/${albumId}/download`}
            filename={`${album.title}.zip`}
            label="Download ZIP"
          />
          <Button
            variant="ghost"
            onClick={() =>
              deleteAlbumMutation.mutate(albumId, {
                onSuccess: () => router.push("/albums"),
              })
            }
            disabled={deleteAlbumMutation.isPending}
            className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            {deleteAlbumMutation.isPending ? (
              <>
                <Spinner />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                <span>Delete</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {photos.length === 0 && !isLoading ? (
        <Empty className="rounded-3xl border border-dashed border-border/80 bg-card/40 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Images className="text-primary size-8" />
            </EmptyMedia>
            <EmptyTitle>No photos in this album</EmptyTitle>
            <EmptyDescription className="max-w-md mx-auto">
              Open your photo library, select photos, and choose &ldquo;Add to album&rdquo; to populate this collection.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <PhotoGrid photos={photos} isLoading={isLoading} albumId={albumId} />

          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-full px-6"
              >
                {isFetchingNextPage ? (
                  <>
                    <Spinner />
                    <span>Loading more...</span>
                  </>
                ) : (
                  "Load more photos"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
