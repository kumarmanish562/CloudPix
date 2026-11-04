import { useAuthStore } from "@/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export type User = {
  id: string;
  email: string;
  displayName: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type PhotoStatus = "ACTIVE" | "ARCHIVE" | "TRASH";

export type AiTransformType =
  | "REMOVE_BACKGROUND"
  | "BACKGROUND_AND_SHADOW"
  | "CHANGE_BACKGROUND"
  | "GENERATIVE_FILL"
  | "SMART_CROP"
  | "OBJECT_CROP"
  | "RETOUCH"
  | "UPSCALE"
  | "AI_EDIT";

export type Photo = {
  id: string;
  imagekitFileId: string;
  fileName: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  status: PhotoStatus;
  createdAt: string;
  deletedAt: string | null;
  parentPhotoId: string | null;
  aiTransformType: AiTransformType | null;
  favorite: boolean;
  tags: string[];
  contentHash: string | null;
};

export type PhotoFilters = {
  q?: string;
  tag?: string;
  favorite?: boolean;
  mimeType?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "name" | "size";
};

export type AlbumShare = { id: string; token: string | null; expiresAt: string; createdAt: string; revoked: boolean };
export type SharedPhoto = Pick<Photo, "id" | "fileName" | "url" | "thumbnailUrl" | "width" | "height">;
export type SharedAlbum = { title: string; expiresAt: string; photos: PageResponse<SharedPhoto> };

let refreshing: Promise<string> | null = null;
export function refreshAccessToken(): Promise<string> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) throw new Error("Please sign in again");
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      if (response.status === 401 && useAuthStore.getState().refreshToken === refreshToken) useAuthStore.getState().clearAuth();
      throw new Error("Session could not be refreshed. Please sign in again");
    }
    const auth: AuthResponse = await response.json();
    if (useAuthStore.getState().refreshToken !== refreshToken) throw new Error("Session changed. Please try again");
    useAuthStore.getState().setAuth(auth);
    return auth.accessToken;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

async function authenticatedFetch(path: string, options: RequestInit, auth: boolean) {
  const headers = new Headers(options.headers);
  const token = useAuthStore.getState().accessToken;
  if (auth && token) headers.set("Authorization", `Bearer ${token}`);
  let response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (auth && response.status === 401 && useAuthStore.getState().refreshToken) {
    // Reuse a token already refreshed by another concurrent request.
    const current = useAuthStore.getState().accessToken;
    headers.set("Authorization", `Bearer ${current && current !== token ? current : await refreshAccessToken()}`);
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  }
  return response;
}

export async function downloadFile(path: string, filename: string) {
  const response = await authenticatedFetch(path, {}, true);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "Download failed");
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type AiTransformRequest = {
  type: AiTransformType;
  prompt?: string;
  width?: number;
  height?: number;
  focusObject?: string;
};

export type AiTransformPreviewResponse = {
  previewUrl: string;
  type: AiTransformType;
  transformChain: string;
};

export type StorageUsageResponse = {
  libraryUsedBytes: number;
  libraryPhotoCount: number;
  imagekitBandwidthBytes: number | null;
  imagekitStorageBytes: number | null;
};

export type ImageKitAsset = {
  fileId: string;
  fileName: string;
  url: string;
  thumbnailUrl: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  alreadyImported: boolean;
};

export type Album = {
  id: string;
  title: string;
  coverPhotoId: string | null;
  coverThumbnailUrl: string | null;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await authenticatedFetch(path, { ...options, headers }, auth);

  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  register: (body: { email: string; password: string; displayName: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }, false),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }, false),

  logout: () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    return request<void>(
      "/auth/logout",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      false,
    );
  },

  me: () => request<User>("/auth/me"),

  getPhoto: (photoId: string) => request<Photo>(`/photos/${photoId}`),

  getPhotos: (status: PhotoStatus = "ACTIVE", page = 0, size = 24, filters: PhotoFilters = {}) => {
    const params = new URLSearchParams({ status, page: String(page), size: String(size) });
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
    return request<PageResponse<Photo>>(`/photos?${params}`);
  },

  updatePhoto: (id: string, body: { favorite?: boolean; tags?: string[] }) =>
    request<Photo>(`/photos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getTags: () => request<string[]>("/photos/tags"),
  getDuplicates: (page = 0) => request<PageResponse<Photo>>(`/photos/duplicates?page=${page}&size=24`),
  getMemories: (date: string, page = 0) => request<PageResponse<Photo>>(`/photos/memories?date=${encodeURIComponent(date)}&page=${page}&size=24`),
  getShares: (albumId: string) => request<AlbumShare[]>(`/albums/${albumId}/shares`),
  createShare: (albumId: string, expiresInHours: number) => request<AlbumShare>(`/albums/${albumId}/shares`, {
    method: "POST", body: JSON.stringify({ expiresInHours }),
  }),
  revokeShare: (albumId: string, shareId: string) => request<void>(`/albums/${albumId}/shares/${shareId}`, { method: "DELETE" }),
  getSharedAlbum: async (token: string, page = 0) => {
    const album = await request<SharedAlbum>(`/shared/${encodeURIComponent(token)}?page=${page}`, {}, false);
    album.photos.content = album.photos.content.map((photo) => ({ ...photo,
      url: new URL(photo.url, new URL(API_URL).origin).href,
      thumbnailUrl: photo.thumbnailUrl ? new URL(photo.thumbnailUrl, new URL(API_URL).origin).href : null,
    }));
    return album;
  },

  archivePhotos: (photoIds: string[]) =>
    request<void>("/photos/archive", { method: "POST", body: JSON.stringify({ photoIds }) }),

  trashPhotos: (photoIds: string[]) =>
    request<void>("/photos/trash", { method: "POST", body: JSON.stringify({ photoIds }) }),

  restorePhotos: (photoIds: string[]) =>
    request<void>("/photos/restore", { method: "POST", body: JSON.stringify({ photoIds }) }),

  permanentlyDeletePhotos: (photoIds: string[]) =>
    request<void>("/photos/delete-permanent", {
      method: "POST",
      body: JSON.stringify({ photoIds }),
    }),

  getAlbums: () => request<Album[]>("/albums"),

  getAlbum: (albumId: string) => request<Album>(`/albums/${albumId}`),

  createAlbum: (title: string) =>
    request<Album>("/albums", { method: "POST", body: JSON.stringify({ title }) }),

  deleteAlbum: (albumId: string) =>
    request<void>(`/albums/${albumId}`, { method: "DELETE" }),

  getAlbumPhotos: (albumId: string, page = 0, size = 24) =>
    request<PageResponse<Photo>>(`/albums/${albumId}/photos?page=${page}&size=${size}`),

  addPhotosToAlbum: (albumId: string, photoIds: string[]) =>
    request<void>(`/albums/${albumId}/photos`, {
      method: "POST",
      body: JSON.stringify({ photoIds }),
    }),

  removePhotoFromAlbum: (albumId: string, photoId: string) =>
    request<void>(`/albums/${albumId}/photos/${photoId}`, { method: "DELETE" }),

  previewAiTransform: (photoId: string, body: AiTransformRequest) =>
    request<AiTransformPreviewResponse>(`/photos/${photoId}/ai/preview`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  applyAiTransform: (photoId: string, body: AiTransformRequest) =>
    request<Photo>(`/photos/${photoId}/ai/apply`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getStorageUsage: () => request<StorageUsageResponse>("/library/storage"),

  getImageKitAssets: () => request<ImageKitAsset[]>("/library/imagekit-assets"),

  importImageKitAssets: (imagekitFileIds: string[]) =>
    request<Photo[]>("/library/import", {
      method: "POST",
      body: JSON.stringify({ imagekitFileIds }),
    }),
};
