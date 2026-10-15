
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useAuth, useCurrentUser } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";

type AuthGuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

/** Protects pages that require login. */
export function AuthGuard({ children, redirectTo = "/login" }: AuthGuardProps) {
  const router = useRouter();
  const { isReady, isLoggedIn } = useAuth();
  const { isLoading } = useCurrentUser();
  const setReady = useAuthStore((state) => state.setReady);

  useEffect(() => {
    const persistApi = useAuthStore.persist;
    if (!persistApi) {
      setReady();
      return;
    }

    const unsub = persistApi.onFinishHydration(() => setReady());
    if (persistApi.hasHydrated()) setReady();
    return unsub;
  }, [setReady]);

  useEffect(() => {
    if (isReady && !isLoggedIn) {
      router.replace(redirectTo);
    }
  }, [isReady, isLoggedIn, redirectTo, router]);

  if (!isReady || !isLoggedIn || isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background text-muted-foreground">
        <Spinner className="size-6" />
      </div>
    );
  }

  return children;
}