"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PhotoAiEditor } from "@/components/photos/photo-ai-editor";
import { usePhoto } from "@/hooks/use-ai";
import { PhotoMetadataPanel } from "@/components/photos/photo-metadata-panel";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

export default function PhotoDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: photo, isLoading, isError } = usePhoto(params.id);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-6 text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading photo details...</span>
      </div>
    );
  }

  if (isError || !photo) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <p className="text-base font-semibold text-destructive">Photo not found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The photo may have been removed or the link is invalid.
        </p>
        <div className="mt-4">
          <Link href="/photos">
            <Button variant="outline" size="sm" className="rounded-full">
              Back to photos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="space-y-2 border-b border-border/60 pb-5">
        <Link
          href="/photos"
          className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs backdrop-blur-md transition-all hover:border-primary/40 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to photos</span>
        </Link>
        <div className="pt-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {photo.fileName}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {photo.width && photo.height ? `${photo.width} × ${photo.height} px` : "Dimensions unknown"}
            {photo.aiTransformType
              ? ` · AI: ${photo.aiTransformType.replaceAll("_", " ").toLowerCase()}`
              : ""}
          </p>
        </div>
      </div>

      <PhotoMetadataPanel key={`metadata-${photo.id}`} photo={photo} />
      <PhotoAiEditor key={`ai-editor-${photo.id}`} photo={photo} />
    </div>
  );
}
