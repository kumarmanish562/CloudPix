"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X, Check } from "lucide-react";
import { uploadPhotoFile, UploadError } from "@/lib/photo-upload";
import { useUploadQueueStore } from "@/stores/upload-queue-store";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function UploadQueue() {
  const items = useUploadQueueStore((s) => s.items);
  const client = useQueryClient();
  const owner = useAuthStore((s) => s.user?.id);
  useEffect(() => () => { useUploadQueueStore.getState().reset(); }, [owner]);
  useEffect(() => {
    const store = useUploadQueueStore.getState();
    if (!owner || store.items.some((i) => i.status === "uploading")) return;
    const next = store.items.find((i) => i.status === "queued");
    if (!next) return;
    const controller = new AbortController();
    store.patch(next.id, { status: "uploading", controller });
    const patch = (value: Parameters<typeof store.patch>[1]) => {
      if (useUploadQueueStore.getState().items.find((i) => i.id === next.id)?.controller === controller) store.patch(next.id, value);
    };
    uploadPhotoFile(next.file, (progress) => patch({ progress }), controller.signal, next.allowDuplicate)
      .then(() => patch({ status: "done", progress: 100, controller: undefined }))
      .catch((error: Error) => patch({
        status: error.name === "AbortError" ? "cancelled" : "error", error: error.message,
        duplicate: error instanceof UploadError && error.status === 409, controller: undefined,
      }))
      .finally(() => {
        client.invalidateQueries({ queryKey: ["photos"] });
        client.invalidateQueries({ queryKey: ["library"] });
      });
  }, [items, client, owner]);
  if (!items.length) return null;
  const store = useUploadQueueStore.getState();
  const finished = items.filter((i) => i.status === "done").length;
  return (
    <details open className="fixed bottom-4 right-4 z-50 w-[min(100vw-2rem,24rem)] rounded-2xl border bg-card shadow-xl">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
        <Upload className="mr-2 inline size-4" /> Uploads · {finished}/{items.length} completed
      </summary>
      <div className="max-h-72 space-y-4 overflow-y-auto border-t p-4">
        {items.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium">{item.file.name}</p>
              {item.status === "done" ? <Check aria-label="Uploaded" className="size-4 shrink-0 text-emerald-600" /> :
                item.status === "queued" || item.status === "uploading" ? <Button size="icon-xs" variant="ghost"
                  aria-label={`Cancel ${item.file.name}`} onClick={() => store.cancel(item.id)}><X className="size-3" /></Button> : null}
            </div>
            {item.status === "uploading" && <Progress value={item.progress} aria-label={`Uploading ${item.file.name}`} />}
            <p className="text-xs text-muted-foreground" role={item.status === "error" ? "alert" : undefined}>
              {item.status === "error" ? item.error : item.status === "uploading" ? `${item.progress}% · Uploading` : item.status}
            </p>
            {(item.status === "error" || item.status === "cancelled") && <div className="flex gap-2">
              <Button size="xs" variant="outline" onClick={() => store.retry(item.id)}>Retry</Button>
              {item.duplicate && <Button size="xs" variant="outline" onClick={() => store.retry(item.id, true)}>Upload another copy</Button>}
            </div>}
          </div>
        ))}
      </div>
      <div className="border-t p-2"><Button variant="ghost" size="sm" onClick={store.clearFinished}>Clear completed</Button></div>
    </details>
  );
}

