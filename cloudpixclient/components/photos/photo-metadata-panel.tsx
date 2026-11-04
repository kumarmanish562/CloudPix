"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import type { Photo } from "@/lib/api";
import { useUpdatePhoto } from "@/hooks/use-photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DownloadButton } from "@/components/photos/download-button";

export function PhotoMetadataPanel({ photo }: { photo: Photo }) {
  const [tags, setTags] = useState(photo.tags.join(", "));
  const update = useUpdatePhoto();
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const values = [...new Set(tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
    if (values.length > 20 || values.some((tag) => tag.length > 50)) {
      toast.error("Use up to 20 tags, each up to 50 characters."); return;
    }
    try { await update.mutateAsync({ id: photo.id, tags: values }); toast.success("Tags saved"); } catch {}
  }
  return <section className="space-y-4 rounded-2xl border bg-card p-5">
    <div className="flex flex-wrap gap-2">
      <Button variant={photo.favorite ? "default" : "outline"} disabled={update.isPending} aria-pressed={photo.favorite}
        onClick={() => update.mutate({ id: photo.id, favorite: !photo.favorite })}>
        <Heart className={photo.favorite ? "size-4 fill-current" : "size-4"} /> {photo.favorite ? "Favorited" : "Add to favorites"}
      </Button>
      {photo.status !== "TRASH" && <DownloadButton path={`/photos/${photo.id}/download`} filename={photo.fileName} label="Download original" />}
    </div>
    <form onSubmit={save} className="space-y-2">
      <label htmlFor="photo-tags" className="text-sm font-medium">Tags</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="photo-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="travel, family, summer"
          aria-describedby="tags-help" maxLength={1100} />
        <Button variant="secondary" type="submit" disabled={update.isPending}>Save tags</Button>
      </div>
      <p id="tags-help" className="text-xs text-muted-foreground">Separate tags with commas. Up to 20 tags per photo.</p>
    </form>
  </section>;
}

