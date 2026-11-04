"use client";
import { useParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function SharedAlbumPage() {
  const { token } = useParams<{ token: string }>();
  const query = useInfiniteQuery({
    queryKey: ["shared", token], queryFn: ({ pageParam }) => api.getSharedAlbum(token, pageParam),
    initialPageParam: 0, getNextPageParam: (last) => last.photos.last ? undefined : last.photos.page + 1,
    retry: false, staleTime: 0,
  });
  const album = query.data?.pages[0];
  const photos = query.data?.pages.flatMap((p) => p.photos.content) ?? [];
  return <main className="mx-auto w-full max-w-6xl space-y-8 px-5 py-10">
    <Link href="/" className="font-semibold text-primary">CloudPix</Link>
    {query.isPending ? <p>Loading shared album…</p> : query.isError ? <div role="alert" className="rounded-2xl border p-8">
      <h1 className="text-2xl font-semibold">This album is unavailable</h1><p className="mt-2 text-muted-foreground">The link may have expired or been revoked.</p>
    </div> : album && <>
      <header><p className="text-sm text-muted-foreground">Shared with you</p><h1 className="mt-2 text-4xl font-semibold">{album.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{album.photos.totalElements} photos · Available until {new Date(album.expiresAt).toLocaleString()}</p></header>
      {photos.length === 0 && <p className="rounded-2xl border p-8">There are no active photos in this album.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => <a href={photo.url} target="_blank" rel="noreferrer" key={photo.id}
          className="relative aspect-square overflow-hidden rounded-2xl bg-muted" aria-label={`View ${photo.fileName}`}>
          <Image unoptimized fill src={photo.thumbnailUrl ?? photo.url} alt={photo.fileName} className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
        </a>)}
      </div>
      {query.hasNextPage && <Button disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
        {query.isFetchingNextPage ? "Loading…" : "Load more"}</Button>}
    </>}
  </main>;
}

