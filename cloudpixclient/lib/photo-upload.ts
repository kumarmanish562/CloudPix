import type { Photo } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

function parseUploadError(status: number, responseText: string): string {
  if (!responseText) {
    return `Upload failed (${status})`;
  }

  try {
    const body = JSON.parse(responseText) as {
      message?: string;
      detail?: string;
      error?: string;
      title?: string;
    };

    return (
      body.message ??
      body.detail ??
      body.error ??
      body.title ??
      `Upload failed (${status})`
    );
  } catch {
    const trimmed = responseText.trim();
    return trimmed.length > 0 && trimmed.length < 200
      ? trimmed
      : `Upload failed (${status})`;
  }
}

export async function uploadPhotoFile(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<Photo> {
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/photos/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as Photo);
        } catch {
          reject(new Error("Invalid response from server"));
        }
        return;
      }

      reject(new Error(parseUploadError(xhr.status, xhr.responseText)));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}