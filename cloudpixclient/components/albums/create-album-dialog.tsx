"use client";

import { useState } from "react";
import { FolderPlus, Plus, Sparkles } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCreateAlbum } from "@/hooks/use-albums";

const schema = z.object({
  title: z.string().trim().min(1, "Album title is required").max(120, "Title must be 120 characters or less"),
});

type FormValues = z.infer<typeof schema>;

type CreateAlbumDialogProps = {
  trigger?: React.ReactNode;
};

const SUGGESTIONS = [
  "🌴 Summer Trip",
  "🎂 Celebrations",
  "🐶 Furry Friends",
  "🏔️ Adventures",
  "✨ Highlights",
  "👨‍👩‍👧 Family Moments",
];

export function CreateAlbumDialog({ trigger }: CreateAlbumDialogProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateAlbum();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "" },
  });

  const titleValue = useWatch({ control: form.control, name: "title" }) || "";

  async function onSubmit(values: FormValues) {
    await createMutation.mutateAsync(values.title);
    form.reset();
    setOpen(false);
  }

  function applySuggestion(suggestion: string) {
    form.setValue("title", suggestion, { shouldValidate: true, shouldDirty: true });
  }

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="group relative overflow-hidden rounded-full bg-primary px-5 font-medium shadow-md shadow-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 active:scale-95"
        >
          <Plus className="size-4 transition-transform duration-200 group-hover:rotate-90" />
          <span>New album</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px] overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-0 shadow-2xl backdrop-blur-2xl">
          {/* Decorative ambient glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 size-60 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative px-6 pt-6 sm:px-8 sm:pt-8">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-inner">
                  <FolderPlus className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                    Create new album
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Organize and showcase your memories in a custom collection
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form className="mt-6 space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="album-title" className="font-medium text-foreground">
                    Album Name
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {titleValue.length}/120
                  </span>
                </div>
                <Input
                  id="album-title"
                  placeholder="e.g. Road Trip to the Coast 2026"
                  maxLength={120}
                  className="h-11 rounded-xl border-border/80 bg-background/80 px-4 text-sm shadow-xs transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              {/* Inspiration Chips */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Quick inspiration:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-xs text-secondary-foreground transition-all duration-150 hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter className="border-t border-border/60 pt-4 pb-6 sm:pb-8 sm:pt-5 -mx-6 sm:-mx-8 px-6 sm:px-8 bg-muted/20">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="rounded-xl text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !titleValue.trim()}
                  className="min-w-28 rounded-xl bg-primary font-medium text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                >
                  {createMutation.isPending ? (
                    <>
                      <Spinner />
                      <span>Creating...</span>
                    </>
                  ) : (
                    "Create Album"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
