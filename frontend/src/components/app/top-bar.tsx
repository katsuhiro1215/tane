import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { SoundToggle } from "@/components/app/sound-toggle";

export function TopBar({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="flex items-center justify-between gap-2 px-3 pt-3">
      <Link href={backHref} aria-label="もどる" className={appButtonVariants({ variant: "cream", size: "icon" })}>
        <ArrowLeft className="h-6 w-6" strokeWidth={3} />
      </Link>
      <h1 className="rounded-xl border-b-4 border-leaf-dark bg-primary px-6 py-1.5 font-display text-xl font-black tracking-wider text-primary-foreground">
        {title}
      </h1>
      <SoundToggle />
    </header>
  );
}
