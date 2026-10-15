
"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthResponse, User } from "@/lib/api";

/**
 * Stores the logged-in user + tokens.
 * `persist` saves them in localStorage so a page refresh keeps you logged in.
 * `isReady` becomes true after that saved data has been loaded.
 */
type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isReady: boolean;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
  setReady: () => void;
};

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isReady: false,
      setAuth: (auth) =>
        set({
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          user: auth.user,
        }),
      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        }),
      setReady: () => set({ isReady: true }),
    }),
    {
      name: "gp-auth",
      // Noop on the server so persist still hydrates and sets isReady
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setReady();
      },
    },
  ),
);