"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api, type PhotoFilters } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PhotoFilterBar({ filters, onChange }: { filters: PhotoFilters; onChange: (filters: PhotoFilters) => void }) {
  const { data: tags = [] } = useQuery({ queryKey: ["photos", "tags"], queryFn: api.getTags });
  const update = (key: keyof PhotoFilters, value: string) => onChange({ ...filters, [key]: value || undefined });
  const selectClass = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm";
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input aria-label="Search photos by name or tag" placeholder="Search by filename or tag…" className="pl-9"
            value={filters.q ?? ""} maxLength={200} onChange={(e) => update("q", e.target.value)} />
        </div>
        <select aria-label="Sort photos" className={selectClass + " sm:w-44"} value={filters.sort ?? "newest"}
          onChange={(e) => update("sort", e.target.value)}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
          <option value="name">Filename A–Z</option><option value="size">Largest first</option>
        </select>
        <Button variant="ghost" onClick={() => onChange({})}>Clear filters</Button>
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Filter by tag, format, or upload date</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-xs text-muted-foreground">Tag
            <select className={selectClass} value={filters.tag ?? ""} onChange={(e) => update("tag", e.target.value)}>
              <option value="">All tags</option>{tags.map((tag) => <option key={tag}>{tag}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">Format
            <select className={selectClass} value={filters.mimeType ?? ""} onChange={(e) => update("mimeType", e.target.value)}>
              <option value="">All image formats</option>
              {["jpeg", "png", "webp", "gif", "heic", "heif"].map((type) => <option key={type} value={`image/${type}`}>{type.toUpperCase()}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">Uploaded from (UTC)
            <Input type="date" value={filters.from?.slice(0, 10) ?? ""}
              onChange={(e) => update("from", e.target.value ? e.target.value + "T00:00:00Z" : "")} />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">Uploaded before (UTC)
            <Input type="date" value={filters.to?.slice(0, 10) ?? ""}
              onChange={(e) => update("to", e.target.value ? e.target.value + "T00:00:00Z" : "")} />
          </label>
        </div>
      </details>
    </div>
  );
}

