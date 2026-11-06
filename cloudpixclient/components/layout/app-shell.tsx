
"use client";

import { useState } from "react";
import { Menu, Search, Sparkles } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { UploadQueue } from "@/components/photos/upload-queue";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { data: user } = useCurrentUser();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r border-sidebar-border/70 bg-sidebar/90 shadow-[8px_0_40px_-36px_rgba(27,24,47,0.4)] backdrop-blur-xl md:block">
        <SidebarNav user={user} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="h-full w-72 border-sidebar-border bg-sidebar p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarNav user={user} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-col md:pl-[272px]">
        <header className="sticky top-0 z-20 hidden h-[72px] items-center justify-between border-b border-border/60 bg-background/80 px-8 backdrop-blur-xl md:flex lg:px-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Your library</span><span className="text-border">/</span><span>A little space for every moment</span></div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3.5 py-2 text-xs text-muted-foreground xl:flex"><Search className="size-3.5"/><span>Search your memories</span><kbd className="ml-5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px]">⌘ K</kbd></div>
            <div className="flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-2 text-xs font-medium text-primary"><Sparkles className="size-3.5"/><span>Made for your moments</span></div>
          </div>
        </header>
        {isMobile && (
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-xl">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">CloudPix</p>
              {user && (
                <p className="truncate text-xs text-muted-foreground">{user.displayName}</p>
              )}
            </div>
          </header>
        )}

        <main className="mx-auto w-full max-w-[1680px] flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-12 lg:py-10">{children}</main>
        <UploadQueue />
      </div>
    </div>
  );
}
