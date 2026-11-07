import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Android emulator uses 10.0.2.2 to access host machine; iOS uses localhost or your machine's LAN IP.
const DEFAULT_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8080/api" : "http://localhost:8080/api";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

const TOKEN_KEY = "cloudpix_access_token";
const REFRESH_KEY = "cloudpix_refresh_token";

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg =
      data?.message || data?.error || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export type User = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type Photo = {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  status: string;
  createdAt: string;
  favorite: boolean;
  tags: string[];
  aiTransformType: string | null;
};

export type Album = {
  id: string;
  title: string;
  photoCount: number;
  coverThumbnailUrl: string | null;
  updatedAt: string;
};

export type DashboardSummary = {
  totalPhotos: number;
  totalAlbums: number;
  totalFavorites: number;
  totalAiTransformed: number;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  activeShares: number;
  emailVerified: boolean;
};

export const api = {
  login: (credentials: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (data: { email: string; password: string; displayName: string }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () => request<User>("/auth/me"),

  verifyEmail: (payload: { token?: string; code?: string; email?: string }) =>
    request<User>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  resendVerification: (email: string) =>
    request<{ message: string }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  getPhotos: (page = 0, size = 20) =>
    request<{ content: Photo[]; totalElements: number }>(
      `/photos?page=${page}&size=${size}&status=ACTIVE`
    ),

  getPhoto: (id: string) => request<Photo>(`/photos/${id}`),

  toggleFavorite: (id: string, favorite: boolean) =>
    request<Photo>(`/photos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ favorite }),
    }),

  getAlbums: () => request<Album[]>("/albums"),

  getDashboardSummary: () => request<DashboardSummary>("/dashboard/summary"),

  uploadPhoto: async (uri: string, fileName: string, mimeType: string) => {
    const token = await getAccessToken();
    const formData = new FormData();
    // React Native FormData file object representation
    formData.append("file", {
      uri,
      name: fileName || "mobile-upload.jpg",
      type: mimeType || "image/jpeg",
    } as unknown as Blob);

    const res = await fetch(`${API_URL}/photos/upload?allowDuplicate=false`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Photo upload failed");
    }

    return res.json();
  },
};

