import { refreshAccessToken, type Photo } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export class UploadError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function uploadPhotoFile(file: File, onProgress?: (progress: number) => void,
  signal?: AbortSignal, allowDuplicate = false, retried = false): Promise<Photo> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error("Please sign in to upload");
  if (signal?.aborted) throw new DOMException("Upload cancelled", "AbortError");
  try {
    return await new Promise<Photo>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const abort = () => xhr.abort();
      const cleanup = () => signal?.removeEventListener("abort", abort);
      xhr.open("POST", `${API_URL}/photos/upload?allowDuplicate=${allowDuplicate}`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.timeout = 180_000;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100));
      };
      xhr.onload = () => {
        cleanup();
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText) as Photo); }
          catch { reject(new Error("Invalid upload response")); }
        } else {
          let message = `Upload failed (${xhr.status})`;
          try { message = JSON.parse(xhr.responseText).message ?? message; } catch {}
          reject(new UploadError(message, xhr.status));
        }
      };
      xhr.onerror = () => { cleanup(); reject(new Error("Network error. You can retry this upload.")); };
      xhr.ontimeout = () => { cleanup(); reject(new Error("Upload timed out. Please retry.")); };
      xhr.onabort = () => { cleanup(); reject(new DOMException("Upload cancelled", "AbortError")); };
      signal?.addEventListener("abort", abort, { once: true });
      const form = new FormData(); form.append("file", file); xhr.send(form);
    });
  } catch (error) {
    if (error instanceof UploadError && error.status === 401 && !retried && !signal?.aborted) {
      if (useAuthStore.getState().accessToken === token) await refreshAccessToken();
      return uploadPhotoFile(file, onProgress, signal, allowDuplicate, true);
    }
    throw error;
  }
}
