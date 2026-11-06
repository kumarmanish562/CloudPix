
import Link from "next/link";
import { GuestGuard } from "@/components/auth/guest-guard";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Image from "next/image";
import { ArrowUpRight, Check, Cloud, Images, Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestGuard>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f4f0] px-4 py-10 dark:bg-background sm:px-8 lg:p-10">
        <div className="pointer-events-none absolute -left-32 -top-32 size-[34rem] rounded-full bg-violet-200/40 blur-[100px] dark:bg-violet-950/25" />
        <div className="pointer-events-none absolute -bottom-40 right-1/4 size-[30rem] rounded-full bg-amber-100/50 blur-[100px] dark:bg-amber-950/15" />
        <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-8">
          <ModeToggle />
        </div>

        <div className="relative grid w-full max-w-[1120px] overflow-hidden rounded-[30px] border border-white/80 bg-white/80 shadow-[0_32px_100px_-48px_rgba(31,25,55,0.4)] backdrop-blur-2xl dark:border-border/70 dark:bg-card/80 lg:min-h-[680px] lg:grid-cols-[1.02fr_0.98fr]">
          <section className="relative hidden flex-col justify-between overflow-hidden bg-[#211b32] p-10 text-white lg:flex xl:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(160,131,255,0.35),transparent_43%),radial-gradient(ellipse_at_92%_95%,rgba(238,180,116,0.22),transparent_38%)]" />
            <div className="absolute -right-24 top-36 size-80 rounded-full border border-white/10" />
            <div className="absolute -right-12 top-48 size-56 rounded-full border border-white/10" />
            <div className="relative">
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Image src="/logo2.svg" alt="" width={30} height={30} /></span>
                <span className="text-lg font-semibold tracking-tight">CloudPix</span>
              </Link>
            </div>
            <div className="relative max-w-md pb-2">
              <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-white/10 text-violet-200 ring-1 ring-white/15"><Sparkles className="size-5" /></div>
              <h1 className="text-[42px] font-medium leading-[1.12] tracking-[-0.04em] xl:text-[48px]">Your life, in all its color.</h1>
              <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/65">A thoughtful home for the photos you love, the little moments you want to keep, and the stories you share.</p>
              <div className="mt-9 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
                <div className="flex -space-x-2"><span className="size-8 rounded-full border-2 border-[#29223d] bg-amber-200"/><span className="size-8 rounded-full border-2 border-[#29223d] bg-rose-300"/><span className="size-8 rounded-full border-2 border-[#29223d] bg-sky-200"/></div>
                <div className="text-xs leading-5 text-white/70"><span className="font-medium text-white">Every moment belongs.</span><br/>Your personal photo space, beautifully organized.</div>
                <ArrowUpRight className="ml-auto size-4 text-white/50" />
              </div>
            </div>
            <div className="relative flex items-center gap-5 text-[11px] text-white/50"><span className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-300"/> Private by design</span><span className="flex items-center gap-1.5"><Cloud className="size-3.5 text-violet-200"/> Your library, always with you</span></div>
          </section>

          <section className="flex items-center justify-center px-6 py-16 sm:px-12 lg:px-12 xl:px-16">
            <div className="w-full max-w-[390px]">
              <div className="mb-9 lg:hidden">
                <Link href="/" className="inline-flex items-center gap-3 text-xl font-semibold tracking-tight text-foreground"><Image src="/logo2.svg" alt="" width={34} height={34} />CloudPix</Link>
                <p className="mt-3 text-sm text-muted-foreground">A thoughtful home for your favorite moments.</p>
              </div>
              <div className="mb-8 hidden lg:block">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-primary"><Images className="size-3.5"/> Your photo space</div>
                <p className="text-sm text-muted-foreground">Store, organize, and revisit the moments that matter.</p>
              </div>
              {children}
              <p className="mt-8 text-center text-[11px] leading-5 text-muted-foreground">By continuing, you agree to keep your memories safe and your account credentials private.</p>
            </div>
          </section>
        </div>
      </div>
    </GuestGuard>
  );
}
