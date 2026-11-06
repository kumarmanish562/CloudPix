"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAiApply, useAiPreview } from "@/hooks/use-ai";
import type { AiTransformRequest, AiTransformType, Photo } from "@/lib/api";

const TRANSFORMS: {
  type: AiTransformType;
  label: string;
  description: string;
  needsPrompt?: boolean;
  needsDimensions?: boolean;
  needsFocus?: boolean;
}[] = [
  {
    type: "REMOVE_BACKGROUND",
    label: "Remove background",
    description: "Isolate subject with high precision",
  },
  {
    type: "BACKGROUND_AND_SHADOW",
    label: "Background + shadow",
    description: "Remove background & add drop shadow",
  },
  {
    type: "CHANGE_BACKGROUND",
    label: "Change background",
    description: "Replace scene using text prompt",
    needsPrompt: true,
  },
  {
    type: "GENERATIVE_FILL",
    label: "Generative fill",
    description: "Extend canvas with generative content",
    needsPrompt: true,
    needsDimensions: true,
  },
  {
    type: "SMART_CROP",
    label: "Smart crop",
    description: "Object-aware crop to target size",
    needsDimensions: true,
  },
  {
    type: "OBJECT_CROP",
    label: "Object crop",
    description: "Crop around named subject (e.g. dog)",
    needsFocus: true,
  },
  { type: "RETOUCH", label: "Retouch", description: "Improve clarity, tone, and lighting" },
  { type: "UPSCALE", label: "Upscale", description: "Increase resolution with AI" },
  {
    type: "AI_EDIT",
    label: "AI edit",
    description: "Edit image with natural language",
    needsPrompt: true,
  },
];

type PhotoAiEditorProps = {
  photo: Photo;
};

export function PhotoAiEditor({ photo }: PhotoAiEditorProps) {
  const [selectedType, setSelectedType] = useState<AiTransformType>("REMOVE_BACKGROUND");
  const [prompt, setPrompt] = useState("");
  const [focusObject, setFocusObject] = useState("");
  const [width, setWidth] = useState(String(photo.width ?? 1200));
  const [height, setHeight] = useState(String(photo.height ?? 800));
  const [preview, setPreview] = useState<{ url: string; key: string } | null>(null);
  const previewKey = JSON.stringify([selectedType, prompt, focusObject, width, height, photo.id]);
  const previewUrl = preview?.key === previewKey ? preview.url : null;
  const router = useRouter();

  const previewMutation = useAiPreview(photo.id);
  const applyMutation = useAiApply(photo.id);

  const selectedTransform = TRANSFORMS.find((item) => item.type === selectedType)!;

  function buildRequest(): AiTransformRequest {
    return {
      type: selectedType,
      prompt: prompt.trim() || undefined,
      focusObject: focusObject.trim() || undefined,
      width: Number(width) || undefined,
      height: Number(height) || undefined,
    };
  }

  async function handlePreview() {
    try {
      const response = await previewMutation.mutateAsync(buildRequest());
      setPreview({ url: response.previewUrl, key: previewKey });
    } catch {
      /* The mutation displays the error toast. */
    }
  }

  async function handleApply() {
    try {
      const saved = await applyMutation.mutateAsync(buildRequest());
      router.push(`/photos/${saved.id}`);
    } catch {
      /* The mutation displays the error toast. */
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* Control Studio Sidebar */}
      <aside className="space-y-5 rounded-3xl border border-border/80 bg-card/90 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">AI Studio</h3>
            <p className="text-[11px] text-muted-foreground">Select neural transformation</p>
          </div>
        </div>

        {/* Transform Presets Grid */}
        <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
          {TRANSFORMS.map((transform) => {
            const isSelected = selectedType === transform.type;
            return (
              <button
                key={transform.type}
                type="button"
                onClick={() => setSelectedType(transform.type)}
                className={`group flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/30"
                    : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <p
                    className={`text-xs font-semibold ${
                      isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                    }`}
                  >
                    {transform.label}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                    {transform.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Parameter Inputs */}
        <div className="space-y-3 border-t border-border/60 pt-4">
          {selectedTransform.needsPrompt && (
            <div className="space-y-1.5">
              <Label htmlFor="ai-prompt" className="text-xs font-medium">
                Prompt Description
              </Label>
              <Textarea
                id="ai-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="e.g. Cinematic sunset on a tropical beach"
                rows={3}
                className="rounded-xl border-border/80 text-xs resize-none"
              />
            </div>
          )}

          {selectedTransform.needsFocus && (
            <div className="space-y-1.5">
              <Label htmlFor="ai-focus" className="text-xs font-medium">
                Subject to focus
              </Label>
              <Input
                id="ai-focus"
                value={focusObject}
                onChange={(event) => setFocusObject(event.target.value)}
                placeholder="e.g. dog, person, car"
                className="h-9 rounded-xl border-border/80 text-xs"
              />
            </div>
          )}

          {selectedTransform.needsDimensions && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="ai-width" className="text-xs font-medium">
                  Width (px)
                </Label>
                <Input
                  id="ai-width"
                  type="number"
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                  className="h-9 rounded-xl border-border/80 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-height" className="text-xs font-medium">
                  Height (px)
                </Label>
                <Input
                  id="ai-height"
                  type="number"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  className="h-9 rounded-xl border-border/80 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={previewMutation.isPending || applyMutation.isPending}
            className="rounded-xl border-border/80 bg-background/80 shadow-2xs hover:border-primary/40 hover:text-primary"
          >
            {previewMutation.isPending ? (
              <>
                <Spinner />
                <span>Processing preview...</span>
              </>
            ) : (
              <>
                <Wand2 className="size-4" />
                <span>Generate Preview</span>
              </>
            )}
          </Button>

          <Button
            onClick={handleApply}
            disabled={applyMutation.isPending || previewMutation.isPending}
            className="rounded-xl bg-primary font-medium text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
          >
            {applyMutation.isPending ? (
              <>
                <Spinner />
                <span>Saving transformation...</span>
              </>
            ) : (
              "Save as New Photo"
            )}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground/80 leading-relaxed text-center">
          Powered by ImageKit AI transforms. Fast lossless processing.
        </p>
      </aside>

      {/* Side-by-side Visual Studio Viewport */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Original */}
        <figure className="group flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
            <span className="text-xs font-medium text-foreground">Original Image</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              Source
            </span>
          </div>
          <div className="relative flex-1 min-h-[360px] p-4 flex items-center justify-center bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="relative h-full w-full aspect-[4/3]">
              <Image src={photo.url} alt={photo.fileName} fill className="object-contain" />
            </div>
          </div>
        </figure>

        {/* AI Preview */}
        <figure className="group flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              AI Preview
            </span>
            {previewUrl && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Ready
              </span>
            )}
          </div>
          <div className="relative flex-1 min-h-[360px] p-4 flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]">
            {previewUrl ? (
              <div className="relative h-full w-full aspect-[4/3] animate-in fade-in zoom-in-95 duration-300">
                <Image
                  src={previewUrl}
                  alt={`${photo.fileName} preview`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-xs">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50 mb-3 text-muted-foreground/60">
                  <Wand2 className="size-6" />
                </div>
                <p className="text-xs font-medium text-foreground">No preview generated yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Select a transform on the left and click &ldquo;Generate Preview&rdquo; to test results.
                </p>
              </div>
            )}
          </div>
        </figure>
      </div>
    </div>
  );
}
