import { cn } from "@/lib/utils";

export function LevelBadge({ level }: { level: number }) {
  return (
    <span className="rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black whitespace-nowrap">
      だん {level}
    </span>
  );
}

/** 段が上がったときに出す。at（上がったときの正解の数）が変わるたびに動きが最初から始まる */
export function LevelUpText({ at }: { at: number | null }) {
  if (at === null) return null;
  return (
    <p
      key={at}
      role="status"
      className="absolute top-3 left-3 animate-pop-in rounded-full bg-primary px-3 py-0.5 font-display text-sm font-black text-primary-foreground"
    >
      レベルアップ！
    </p>
  );
}

/** 3・2・1 と「スタート！」（count が 0 のとき） */
export function CountdownBanner({ count }: { count: number }) {
  return (
    <p
      key={count}
      role="status"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-1/3 z-30 animate-pop-in text-center font-display font-black text-cta-to [text-shadow:0_4px_0_#fff]",
        count > 0 ? "text-8xl" : "text-5xl"
      )}
    >
      {count > 0 ? count : "スタート！"}
    </p>
  );
}

export function TimeUpBanner() {
  return (
    <p
      role="status"
      className="pointer-events-none absolute inset-x-0 top-1/3 z-30 animate-fever-banner text-center font-display text-5xl font-black text-[#ffe14d] [text-shadow:0_4px_0_#b81e5d,0_0_18px_#ff3d8b]"
    >
      タイムアップ！
    </p>
  );
}
