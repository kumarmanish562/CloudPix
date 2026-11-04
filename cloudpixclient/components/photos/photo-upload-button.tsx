"use client";
import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUploadQueueStore } from "@/stores/upload-queue-store";
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

export function PhotoUploadButton() {
  const input = useRef<HTMLInputElement>(null);
  const add = useUploadQueueStore((s) => s.add);
  function selected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = "";
    const valid = files.filter((file) => TYPES.has(file.type) && file.size > 0 && file.size <= 25 * 1024 * 1024);
    if (valid.length !== files.length) toast.error("Some files were skipped. Choose JPEG, PNG, WebP, GIF, HEIC or HEIF images up to 25 MB.");
    const pending = useUploadQueueStore.getState().items.filter((i) => i.status === "queued" || i.status === "uploading").length;
    const accepted = valid.slice(0, Math.max(0, 100 - pending));
    if (accepted.length < valid.length) toast.error("The upload queue holds up to 100 pending photos.");
    add(accepted);
  }
  return <><input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" multiple className="hidden" onChange={selected} />
    <Button onClick={() => input.current?.click()}><ImagePlus className="size-4" /> Upload photos</Button></>;
}
