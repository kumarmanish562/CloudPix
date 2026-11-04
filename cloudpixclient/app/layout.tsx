
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/provider/theme-provider";
import QueryProvider from "@/components/provider/query-provider";

export const metadata: Metadata = {
  title: {
    default: "CloudPix",
    template: "%s | CloudPix",
  },
  description:
    "CloudPix — Your photos, everywhere. Securely store, organize, discover, and share your photos and videos.",
  applicationName: "CloudPix",
  keywords: [
    "CloudPix",
    "photo gallery",
    "cloud photo storage",
    "photo backup",
    "video storage",
    "AI photo search",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full font-sans antialiased"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading CloudPix…</div>}>
              {children}
            </Suspense>
            <Toaster richColors closeButton position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
