"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ShareAlbumDialog({ albumId }: { albumId: string }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(168);
  const [link, setLink] = useState("");
  const client = useQueryClient();
  const key = ["albums", albumId, "shares"];
  const query = useQuery({ queryKey: key, queryFn: () => api.getShares(albumId), enabled: open });
  const create = useMutation({
    mutationFn: () => api.createShare(albumId, hours),
    onSuccess: (share) => { setLink(`${window.location.origin}/shared/${share.token}`); client.invalidateQueries({ queryKey: key }); },
    onError: (error) => toast.error(error.message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeShare(albumId, id),
    onSuccess: () => { setLink(""); client.invalidateQueries({ queryKey: key }); toast.success("Share link revoked"); },
    onError: (error) => toast.error(error.message),
  });
  async function copy() {
    try { await navigator.clipboard.writeText(link); toast.success("Link copied"); }
    catch { toast.error("Select and copy the link below."); }
  }
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><Share2 className="size-4" /> Share album</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>Share this album</DialogTitle>
        <DialogDescription>Anyone with the link can view active photos until it expires or you revoke it. Copy a new link before closing.</DialogDescription>
      </DialogHeader>
      <label className="space-y-2 text-sm">Link expires in
        <select className="mt-2 h-10 w-full rounded-lg border bg-background px-3" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          <option value={1}>1 hour</option><option value={24}>1 day</option><option value={168}>7 days</option><option value={720}>30 days</option>
        </select>
      </label>
      <Button disabled={create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Creating…" : "Create share link"}</Button>
      {link && <div className="flex gap-2"><Input aria-label="New share link" readOnly value={link} onFocus={(e) => e.target.select()} />
        <Button size="icon" variant="outline" aria-label="Copy share link" onClick={copy}><Copy className="size-4" /></Button></div>}
      <div className="max-h-52 space-y-2 overflow-y-auto">
        {query.isError && <p role="alert" className="text-sm text-destructive">{query.error.message}</p>}
        {query.isLoading && <p className="text-sm text-muted-foreground">Loading links…</p>}
        {query.data?.map((share) => <div key={share.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-xs">
          <span>{share.revoked ? "Revoked" : new Date(share.expiresAt) <= new Date() ? "Expired" : "Active"} · Expires {new Date(share.expiresAt).toLocaleString()}</span>
          {!share.revoked && <Button size="xs" variant="destructive" disabled={revoke.isPending} onClick={() => revoke.mutate(share.id)}>Revoke</Button>}
        </div>)}
      </div>
    </DialogContent></Dialog>
  </>;
}

