"use client";
import { useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { PhotoBulkToolbar } from "@/components/photos/photo-bulk-toolbar";
import { usePhotoSelectionStore } from "@/stores/photo-selection-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PhotoDiscoveryView({ mode }: { mode: "duplicates" | "memories" }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const query = useInfiniteQuery({
    queryKey: ["photos", mode, date],
    queryFn: ({ pageParam }) => mode === "duplicates" ? api.getDuplicates(pageParam) : api.getMemories(date, pageParam),
    initialPageParam: 0, getNextPageParam: (last) => last.last ? undefined : last.page + 1,
    enabled: mode === "duplicates" || !!date,
  });
  const select = usePhotoSelectionStore((s) => s.enterSelectMode);
  const selectAll = usePhotoSelectionStore((s) => s.selectAll);
  const exit = usePhotoSelectionStore((s) => s.exitSelectMode);
  const selecting = usePhotoSelectionStore((s) => s.isSelectMode);
  useEffect(() => { exit(); }, [date, exit]);
  const photos = query.data?.pages.flatMap((p) => p.content) ?? [];
  const groups = Object.values(photos.reduce<Record<string, typeof photos>>((result, photo) => {
    (result[photo.contentHash ?? photo.id] ??= []).push(photo);
    return result;
  }, {}));
  function selectExtras() {
    select();
    selectAll(groups.flatMap((group) => [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).slice(1).map((p) => p.id)));
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Rediscover your library</p>
          <h1 className="text-3xl font-semibold">{mode === "duplicates" ? "Duplicate photos" : "On this day"}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {mode === "duplicates" ? "Exact matches from new uploads, including archived photos. Keep a copy and move the extras to trash. Older imports without a fingerprint are not compared."
              : "Photos uploaded on this day in previous years, based on the UTC upload date."}
          </p>
        </div>
        {mode === "memories" ? <label className="space-y-1 text-sm">Choose a day
          <Input type="date" value={date} required onChange={(e) => setDate(e.target.value)} /></label>
          : <Button variant="outline" disabled={!photos.length} onClick={() => selecting ? exit() : selectExtras()}>{selecting ? "Cancel selection" : "Select extra copies"}</Button>}
      </div>
      <PhotoBulkToolbar photoIds={photos.map((p) => p.id)} context={mode === "duplicates" ? "DUPLICATES" : "ACTIVE"} />
      {query.isError ? <div role="alert"><p>{query.error.message}</p><Button onClick={() => query.refetch()}>Try again</Button></div>
        : !query.isLoading && photos.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          {mode === "duplicates" ? "No duplicate uploads found." : "No memories for this date yet."}</div>
        : mode === "duplicates" && !query.isLoading ? <div className="space-y-8">{groups.map((group, index) => (
          <section key={group[0].contentHash ?? group[0].id} className="space-y-3">
            <h2 className="text-sm font-medium">Match set {index + 1} <span className="text-muted-foreground">· {group.length} copies shown</span></h2>
            <PhotoGrid photos={group} selectable />
          </section>
        ))}</div> : <PhotoGrid photos={photos} isLoading={query.isLoading} selectable showTrashAction={false} />}
      {query.hasNextPage && <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
        {query.isFetchingNextPage ? "Loading…" : "Load more"}</Button>}
    </div>
  );
}

