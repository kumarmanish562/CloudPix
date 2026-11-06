"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, Filter, Search, X } from "lucide-react";
import { api, type PhotoFilters } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PhotoFilterBar({
  filters,
  onChange,
}: {
  filters: PhotoFilters;
  onChange: (filters: PhotoFilters) => void;
}) {
  const { data: tags = [] } = useQuery({
    queryKey: ["photos", "tags"],
    queryFn: api.getTags,
  });

  const update = (key: keyof PhotoFilters, value: string) =>
    onChange({ ...filters, [key]: value || undefined });

  const activeCount = Object.values(filters).filter(Boolean).length;
  const selectClass =
    "h-10 w-full rounded-xl border border-border/80 bg-background/90 px-3 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-4 rounded-3xl border border-border/80 bg-card/80 p-5 shadow-sm backdrop-blur-xl transition-all">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Search photos by name or tag"
            placeholder="Search by filename or tag…"
            className="h-10 rounded-xl border-border/80 bg-background/90 pl-10 text-xs shadow-2xs transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            value={filters.q ?? ""}
            maxLength={200}
            onChange={(e) => update("q", e.target.value)}
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => update("q", "")}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Sort select */}
        <div className="relative sm:w-48 shrink-0">
          <ArrowDownUp className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <select
            aria-label="Sort photos"
            className={`${selectClass} pl-9 appearance-none cursor-pointer`}
            value={filters.sort ?? "newest"}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Filename A–Z</option>
            <option value="size">Largest first</option>
          </select>
        </div>

        {/* Clear filters button */}
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({})}
            className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>

      <details className="group border-t border-border/60 pt-3">
        <summary className="flex cursor-pointer items-center justify-between py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <span className="flex items-center gap-2">
            <Filter className="size-3.5 text-primary" />
            <span>Filter by tag, format, or upload date</span>
          </span>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {activeCount} active
            </span>
          )}
        </summary>

        <div className="mt-4 grid gap-4 pt-1 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <label htmlFor="photo-tag-filter" className="font-medium text-foreground">
              Tag
            </label>
            <select
              id="photo-tag-filter"
              className={selectClass}
              value={filters.tag ?? ""}
              onChange={(e) => update("tag", e.target.value)}
            >
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <label htmlFor="photo-format-filter" className="font-medium text-foreground">
              Format
            </label>
            <select
              id="photo-format-filter"
              className={selectClass}
              value={filters.mimeType ?? ""}
              onChange={(e) => update("mimeType", e.target.value)}
            >
              <option value="">All image formats</option>
              {["jpeg", "png", "webp", "gif", "heic", "heif"].map((type) => (
                <option key={type} value={`image/${type}`}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <label className="space-y-1.5 text-xs font-medium text-foreground">
            <span>Uploaded from (UTC)</span>
            <Input
              type="date"
              className="h-10 rounded-xl border-border/80 bg-background/90 text-xs shadow-2xs"
              value={filters.from?.slice(0, 10) ?? ""}
              onChange={(e) =>
                update("from", e.target.value ? e.target.value + "T00:00:00Z" : "")
              }
            />
          </label>

          <label className="space-y-1.5 text-xs font-medium text-foreground">
            <span>Uploaded before (UTC)</span>
            <Input
              type="date"
              className="h-10 rounded-xl border-border/80 bg-background/90 text-xs shadow-2xs"
              value={filters.to?.slice(0, 10) ?? ""}
              onChange={(e) =>
                update("to", e.target.value ? e.target.value + "T00:00:00Z" : "")
              }
            />
          </label>
        </div>
      </details>
    </div>
  );
}
