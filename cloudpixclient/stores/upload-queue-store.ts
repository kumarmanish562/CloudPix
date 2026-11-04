"use client";
import { create } from "zustand";
export type UploadItem = {
  id: string; file: File; progress: number;
  status: "queued" | "uploading" | "done" | "error" | "cancelled";
  error?: string; duplicate?: boolean; allowDuplicate?: boolean; controller?: AbortController;
};
export const useUploadQueueStore = create<{
  items: UploadItem[];
  add: (files: File[]) => void;
  patch: (id: string, patch: Partial<UploadItem>) => void;
  cancel: (id: string) => void;
  retry: (id: string, allowDuplicate?: boolean) => void;
  clearFinished: () => void;
  reset: () => void;
}>((set, get) => ({
  items: [],
  add: (files) => set((state) => ({ items: [...state.items, ...files.map((file) => ({
    id: crypto.randomUUID(), file, progress: 0, status: "queued" as const,
  }))] })),
  patch: (id, patch) => set((state) => ({ items: state.items.map((item) => item.id === id ? { ...item, ...patch } : item) })),
  cancel: (id) => {
    get().items.find((item) => item.id === id)?.controller?.abort();
    get().patch(id, { status: "cancelled", controller: undefined });
  },
  retry: (id, allowDuplicate = false) => get().patch(id, {
    status: "queued", progress: 0, error: undefined, duplicate: false, allowDuplicate,
  }),
  clearFinished: () => set((state) => ({ items: state.items.filter((i) => i.status === "queued" || i.status === "uploading" || i.status === "error") })),
  reset: () => { get().items.forEach((i) => i.controller?.abort()); set({ items: [] }); },
}));

