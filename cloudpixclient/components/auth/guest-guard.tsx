
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";

type GuestGuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

/** For login/register pages — redirect away if already logged in. */
export function GuestGuard({ children, redirectTo = "/" }: GuestGuardProps) {
  const router = useRouter();
  const { isReady, isLoggedIn } = useAuth();
  const setReady = useAuthStore((state) => state.setReady);

  // Persist may finish before mount — subscribe first, then check.
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
    if (isReady && isLoggedIn) {
      router.replace(redirectTo);
    }
  }, [isReady, isLoggedIn, redirectTo, router]);

  if (!isReady || isLoggedIn) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background text-muted-foreground">
        <Spinner className="size-6" />
      </div>
    );
  }

  return children;
}