"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Cloud,
  FolderOpen,
  Heart,
  Images,
  Mail,
  RefreshCw,
  Share2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-auth";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { formatBytes } from "@/lib/format-bytes";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoUploadButton } from "@/components/photos/photo-upload-button";
import { CreateAlbumDialog } from "@/components/albums/create-album-dialog";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: summary, isLoading, refetch } = useDashboardSummary();
  const queryClient = useQueryClient();

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || code.trim().length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }
    setVerifying(true);
    try {
      await api.verifyEmail({ code: code.trim(), email: user?.email });
      toast.success("Email verified successfully!");
      setVerifyOpen(false);
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendEmail() {
    if (!user?.email) return;
    setResending(true);
    try {
      await api.resendVerification(user.email);
      toast.success("Verification code sent to your email!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not resend email";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-3xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  const emailIsVerified = summary?.emailVerified ?? user?.emailVerified ?? false;
  const storageUsed = summary?.storageUsedBytes ?? 0;
  const storageQuota = summary?.storageQuotaBytes ?? 5 * 1024 * 1024 * 1024;
  const storagePct = Math.min(100, Math.round((storageUsed / storageQuota) * 100));

  const trendData = summary?.uploadTrends ?? [];
  const formatData = summary?.formatDistribution ?? [];
  const recentPhotos = summary?.recentPhotos ?? [];

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#1e1730] p-6 sm:p-9 text-white shadow-xl shadow-violet-950/20">
        <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-1/3 size-72 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-violet-200">
              <Sparkles className="size-3.5" /> CloudPix Dashboard & Insights
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back{user?.displayName ? `, ${user.displayName}` : ""}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Here is an overview of your storage usage, upload velocity, and organized collections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <PhotoUploadButton />
            <CreateAlbumDialog />
          </div>
        </div>

        {/* Verification Status Banner */}
        {!emailIsVerified ? (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between text-amber-200">
            <div className="flex items-center gap-2.5 text-xs">
              <AlertTriangle className="size-4 shrink-0 text-amber-400" />
              <span>
                Your email is not verified yet. Verify now to secure your account and unlock higher limits.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="xs"
                variant="outline"
                onClick={() => setVerifyOpen(true)}
                className="border-amber-400/40 bg-amber-400/20 text-white hover:bg-amber-400/30 text-xs rounded-full"
              >
                <Mail className="size-3 mr-1" />
                Enter 6-digit Code
              </Button>
              <Button
                size="xs"
                variant="ghost"
                disabled={resending}
                onClick={handleResendEmail}
                className="text-amber-200 hover:text-white hover:bg-white/10 text-xs rounded-full"
              >
                {resending ? <Spinner className="size-3" /> : "Resend Email"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="size-3.5" /> Email verified & secure
          </div>
        )}
      </section>

      {/* 4 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Photos */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-5 shadow-xs backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Photos Library</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Images className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {summary?.totalPhotos ?? 0}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Heart className="size-3 text-rose-500 fill-rose-500" />
              <span>{summary?.totalFavorites ?? 0} favorited</span>
            </div>
          </div>
        </div>

        {/* Card 2: Albums & Shares */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-5 shadow-xs backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Collections</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <FolderOpen className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {summary?.totalAlbums ?? 0}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Share2 className="size-3 text-violet-500" />
              <span>{summary?.activeShares ?? 0} active share links</span>
            </div>
          </div>
        </div>

        {/* Card 3: AI Creations */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-5 shadow-xs backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">AI Studio Edits</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {summary?.totalAiTransformed ?? 0}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wand2 className="size-3 text-fuchsia-500" />
              <span>Neural enhancements</span>
            </div>
          </div>
        </div>

        {/* Card 4: Storage Meter */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-5 shadow-xs backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Cloud Storage</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Cloud className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {formatBytes(storageUsed)}
              </p>
              <span className="text-xs font-medium text-muted-foreground">of 5 GB</span>
            </div>
            <Progress value={storagePct} className="mt-2.5 h-1.5 rounded-full" />
          </div>
        </div>
      </div>

      {/* Charts & Analytics Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Activity Chart */}
        <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xs backdrop-blur-md lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Upload Activity (7 Days)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily uploads added to your CloudPix library
              </p>
            </div>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => refetch()}
              className="text-muted-foreground hover:text-foreground"
              title="Refresh metrics"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as { date: string; count: number; bytes: number };
                      return (
                        <div className="rounded-xl border border-border/80 bg-popover p-2.5 shadow-lg text-xs">
                          <p className="font-semibold text-foreground">{data.date}</p>
                          <p className="text-primary mt-1">{data.count} photos uploaded</p>
                          <p className="text-muted-foreground">{formatBytes(data.bytes)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#uploadGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Media Format Distribution */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xs backdrop-blur-md">
          <div>
            <h2 className="text-base font-semibold text-foreground">Format Breakdown</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Storage distribution by image format
            </p>

            <div className="mt-5 space-y-3.5">
              {formatData.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No image formats recorded yet.
                </p>
              ) : (
                formatData.map((item) => (
                  <div key={item.format} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{item.format}</span>
                      <span className="text-muted-foreground">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(4, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-border/60 pt-4">
            <Link
              href="/photos"
              className="group flex items-center justify-between text-xs font-medium text-primary hover:underline"
            >
              <span>Explore all in Library</span>
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Uploads Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent Uploads</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your latest photos added to CloudPix
            </p>
          </div>
          <Link
            href="/photos"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>

        {recentPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 py-12 text-center">
            <Images className="size-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-foreground">No photos in library yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Upload your first image to see it here</p>
            <div className="mt-4">
              <PhotoUploadButton />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-6">
            {recentPhotos.map((photo) => (
              <Link
                key={photo.id}
                href={`/photos/${photo.id}`}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
                  <Image
                    src={photo.thumbnailUrl}
                    alt={photo.fileName}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {photo.aiTransformType && (
                    <div className="absolute left-2 top-2 rounded-full bg-black/60 p-1 text-violet-300 backdrop-blur-md">
                      <Sparkles className="size-3" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-xs font-medium text-foreground">{photo.fileName}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Verify Code Dialog Modal */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur-xl">
          <DialogHeader className="space-y-2">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Mail className="size-5" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Enter Verification Code
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter the 6-digit verification code sent to {user?.email}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVerifyCode} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-center text-2xl font-bold tracking-[8px] rounded-xl border-border/80 bg-background/90"
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setVerifyOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={verifying || code.trim().length !== 6}
                className="rounded-xl min-w-28 font-medium"
              >
                {verifying ? <Spinner /> : "Verify Code"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
