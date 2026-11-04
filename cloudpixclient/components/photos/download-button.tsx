"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { downloadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function DownloadButton({ path, filename, label = "Download" }: { path: string; filename: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try { await downloadFile(path, filename); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Download failed"); }
    finally { setBusy(false); }
  }
  return <Button variant="outline" disabled={busy} onClick={download}><Download className="size-4" />
    {busy ? "Preparing download…" : label}</Button>;
}

