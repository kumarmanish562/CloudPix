"use client";

import { useState } from "react";
import { Heart, Tag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Photo } from "@/lib/api";
import { useUpdatePhoto } from "@/hooks/use-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DownloadButton } from "@/components/photos/download-button";
import { formatBytes } from "@/lib/format-bytes";

export function PhotoMetadataPanel({ photo }: { photo: Photo }) {
  const [tags, setTags] = useState(photo.tags.join(", "));
  const update = useUpdatePhoto();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const values = [...new Set(tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
    if (values.length > 20 || values.some((tag) => tag.length > 50)) {
      toast.error("Use up to 20 tags, each up to 50 characters.");
      return;
    }
    try {
      await update.mutateAsync({ id: photo.id, tags: values });
      toast.success("Tags saved");
    } catch {}
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-6 shadow-sm backdrop-blur-xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Actions & Details */}
        <div className="space-y-4 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant={photo.favorite ? "default" : "outline"}
              disabled={update.isPending}
              aria-pressed={photo.favorite}
              onClick={() => update.mutate({ id: photo.id, favorite: !photo.favorite })}
              className="rounded-full shadow-xs transition-all"
            >
              <Heart className={photo.favorite ? "size-4 fill-current text-rose-400" : "size-4 text-muted-foreground"} />
              <span>{photo.favorite ? "Favorited" : "Add to favorites"}</span>
            </Button>

            {photo.status !== "TRASH" && (
              <DownloadButton
                path={`/photos/${photo.id}/download`}
                filename={photo.fileName}
                label="Download original"
              />
            )}

            {photo.aiTransformType && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="size-3" />
                AI {photo.aiTransformType.replaceAll("_", " ").toLowerCase()}
              </span>
            )}
          </div>

          {/* Quick info pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
            <span className="rounded-xl border border-border/60 bg-muted/40 px-2.5 py-1">
              {photo.width && photo.height ? `${photo.width} × ${photo.height} px` : "Unknown size"}
            </span>
            <span className="rounded-xl border border-border/60 bg-muted/40 px-2.5 py-1">
              {formatBytes(photo.sizeBytes)}
            </span>
            <span className="rounded-xl border border-border/60 bg-muted/40 px-2.5 py-1">
              {photo.mimeType ? photo.mimeType.replace("image/", "").toUpperCase() : "IMAGE"}
            </span>
            <span className="rounded-xl border border-border/60 bg-muted/40 px-2.5 py-1">
              Uploaded {new Date(photo.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Tags form */}
        <div className="w-full lg:max-w-md">
          <form onSubmit={save} className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Tag className="size-3.5 text-primary" />
              <label htmlFor="photo-tags">Tags</label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="photo-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="travel, family, summer"
                aria-describedby="tags-help"
                maxLength={1100}
                className="h-10 rounded-xl border-border/80 bg-background/90 text-xs shadow-2xs"
              />
              <Button
                variant="secondary"
                type="submit"
                disabled={update.isPending}
                className="rounded-xl shrink-0"
              >
                Save tags
              </Button>
            </div>
            <p id="tags-help" className="text-[11px] text-muted-foreground">
              Separate tags with commas. Up to 20 tags per photo.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
