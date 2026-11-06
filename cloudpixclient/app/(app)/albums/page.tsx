"use client";

import { FolderOpen, Layers, Sparkles } from "lucide-react";
import { AlbumGrid } from "@/components/albums/album-grid";
import { CreateAlbumDialog } from "@/components/albums/create-album-dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useAlbums } from "@/hooks/use-albums";

export default function AlbumsPage() {
  const { data: albums = [], isLoading } = useAlbums();

  return (
    <div className="space-y-8">
      {/* Rich Collections Banner */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#211b32] px-6 py-8 text-white shadow-xl shadow-violet-950/15 sm:px-9 sm:py-10">
        <div className="absolute -right-12 -top-24 -z-10 size-80 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 -z-10 size-72 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-violet-200">
              <Sparkles className="size-3.5" /> Curate your journeys
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Albums & Collections</h1>
            <p className="mt-2.5 max-w-lg text-sm leading-6 text-white/70 sm:text-base">
              Group your moments by trip, celebration, or theme and share curated galleries with anyone.
            </p>
          </div>
          <div className="shrink-0">
            <CreateAlbumDialog />
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 border-t border-white/10 pt-5 text-sm text-white/70">
          <Layers className="size-4 text-violet-200" />
          <span>
            {albums.length} {albums.length === 1 ? "collection" : "collections"} in your library
          </span>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">All Albums</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse and manage your custom photo groups
            </p>
          </div>
        </div>

        {albums.length === 0 && !isLoading ? (
          <Empty className="rounded-3xl border border-dashed border-border/80 bg-card/40 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpen className="text-primary size-8" />
              </EmptyMedia>
              <EmptyTitle>No albums yet</EmptyTitle>
              <EmptyDescription className="max-w-md mx-auto">
                Albums make it simple to organize photos from events, vacations, or projects into memorable visual collections.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="mt-4">
              <CreateAlbumDialog />
            </EmptyContent>
          </Empty>
        ) : (
          <AlbumGrid albums={albums} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}
