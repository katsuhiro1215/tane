import Link from "next/link";

import { appButtonVariants } from "@/components/app/button";

export function StageNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="font-display text-lg font-black">ステージが みつかりません</p>
      <Link href="/" className={appButtonVariants({ variant: "cta", size: "lg" })}>
        ホームへ もどる
      </Link>
    </main>
  );
}
