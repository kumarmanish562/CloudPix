"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, FolderPlus, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useAddPhotosToAlbum, useAlbums } from "@/hooks/use-albums";
import { usePhotoSelectionStore } from "@/stores/photo-selection-store";
import { CreateAlbumDialog } from "./create-album-dialog";

type AddToAlbumDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoIds: string[];
};

export function AddToAlbumDialog({ open, onOpenChange, photoIds }: AddToAlbumDialogProps) {
  const { data: albums = [], isLoading } = useAlbums();
  const addMutation = useAddPhotosToAlbum();
  const exitSelectMode = usePhotoSelectionStore((state) => state.exitSelectMode);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  async function handleAdd() {
    if (!selectedAlbumId) {
      return;
    }

    await addMutation.mutateAsync({ albumId: selectedAlbumId, photoIds });
    exitSelectMode();
    setSelectedAlbumId(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-0 shadow-2xl backdrop-blur-2xl">
        {/* Ambient lighting */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-60 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="relative p-6 sm:p-8">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-inner">
                <Layers className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                  Add to Album
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Select a destination album for {photoIds.length} {photoIds.length === 1 ? "photo" : "photos"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                  <Spinner className="mb-2 size-5" />
                  <span>Loading your albums...</span>
                </div>
              ) : albums.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 py-8 text-center">
                  <FolderPlus className="mb-2 size-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium text-foreground">No albums created yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Create your first album to organize photos</p>
                  <div className="mt-4">
                    <CreateAlbumDialog
                      trigger={
                        <Button size="sm" variant="outline" className="rounded-full">
                          <Plus className="mr-1.5 size-3.5" />
                          Create album
                        </Button>
                      }
                    />
                  </div>
                </div>
              ) : (
                albums.map((album) => {
                  const isSelected = selectedAlbumId === album.id;
                  return (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => setSelectedAlbumId(album.id)}
                      className={`group relative flex w-full items-center gap-3.5 rounded-2xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                          : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted/60 ring-1 ring-black/5 dark:ring-white/10">
                        {album.coverThumbnailUrl ? (
                          <Image
                            src={album.coverThumbnailUrl}
                            alt={album.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Layers className="size-5 opacity-40" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {album.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
                        </p>
                      </div>

                      <div
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "border border-border/80 group-hover:border-primary/40"
                        }`}
                      >
                        {isSelected && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <DialogFooter className="border-t border-border/60 pt-4 -mx-6 sm:-mx-8 px-6 sm:px-8 bg-muted/20">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!selectedAlbumId || addMutation.isPending || albums.length === 0}
                className="min-w-28 rounded-xl bg-primary font-medium text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
              >
                {addMutation.isPending ? (
                  <>
                    <Spinner />
                    <span>Adding...</span>
                  </>
                ) : (
                  `Add to Album`
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
