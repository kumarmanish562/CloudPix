"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Share2, Copy, Check, Clock, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

export function ShareAlbumDialog({ albumId }: { albumId: string }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(168);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const client = useQueryClient();
  const key = ["albums", albumId, "shares"];

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.getShares(albumId),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => api.createShare(albumId, hours),
    onSuccess: (share) => {
      setLink(`${window.location.origin}/shared/${share.token}`);
      client.invalidateQueries({ queryKey: key });
      toast.success("Share link created successfully!");
    },
    onError: (error) => toast.error(error.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeShare(albumId, id),
    onSuccess: () => {
      setLink("");
      client.invalidateQueries({ queryKey: key });
      toast.success("Share link revoked");
    },
    onError: (error) => toast.error(error.message),
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Please manually copy the link below.");
    }
  }

  const durations = [
    { value: 1, label: "1 hour" },
    { value: 24, label: "24 hours" },
    { value: 168, label: "7 days" },
    { value: 720, label: "30 days" },
  ];

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="rounded-full border-border/80 bg-background/60 shadow-xs backdrop-blur-md transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
      >
        <Share2 className="size-4" />
        <span>Share album</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px] overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-0 shadow-2xl backdrop-blur-2xl">
          {/* Decorative ambient lights */}
          <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-64 rounded-full bg-violet-600/10 blur-3xl" />

          <div className="relative p-6 sm:p-8">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-inner">
                  <Share2 className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                    Share album
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Anyone with the link can view photos in this album until it expires
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-6 space-y-6">
              {/* Expiry selector */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>Link expiration</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {durations.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setHours(d.value)}
                      className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                        hours === d.value
                          ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                          : "border-border/70 bg-background/50 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="w-full rounded-xl bg-primary py-2.5 font-medium text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
              >
                {create.isPending ? (
                  <>
                    <Spinner />
                    <span>Generating link...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="size-4" />
                    <span>Generate share link</span>
                  </>
                )}
              </Button>

              {/* Generated link preview */}
              {link && (
                <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-primary/30 bg-primary/5 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-primary flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" />
                      Ready to share
                    </span>
                    <span className="text-[11px] text-muted-foreground">Expires in {hours}h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="New share link"
                      readOnly
                      value={link}
                      onFocus={(e) => e.target.select()}
                      className="h-10 rounded-xl border-border/80 bg-background/90 text-xs font-mono shadow-inner"
                    />
                    <Button
                      size="sm"
                      variant="default"
                      aria-label="Copy share link"
                      onClick={copy}
                      className="shrink-0 rounded-xl font-medium"
                    >
                      {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                      <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing shares */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Active share links</span>
                  <span>{query.data?.length ?? 0} total</span>
                </div>

                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {query.isError && (
                    <p role="alert" className="text-xs text-destructive">
                      {query.error.message}
                    </p>
                  )}
                  {query.isLoading && (
                    <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                      <Spinner className="mr-2" /> Loading active links...
                    </div>
                  )}
                  {query.data?.length === 0 && !query.isLoading && (
                    <p className="rounded-xl border border-dashed border-border/60 py-4 text-center text-xs text-muted-foreground">
                      No active share links yet.
                    </p>
                  )}
                  {query.data?.map((share) => {
                    const isExpired = new Date(share.expiresAt) <= new Date();
                    const statusText = share.revoked ? "Revoked" : isExpired ? "Expired" : "Active";
                    const statusVariant = share.revoked
                      ? "destructive"
                      : isExpired
                      ? "secondary"
                      : "default";

                    return (
                      <div
                        key={share.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 text-xs backdrop-blur-xs transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={statusVariant} className="text-[10px] px-1.5 py-0.5">
                              {statusText}
                            </Badge>
                            <span className="truncate text-muted-foreground text-[11px]">
                              Expires {new Date(share.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {!share.revoked && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            disabled={revoke.isPending}
                            onClick={() => revoke.mutate(share.id)}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Revoke link"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
