import Link from "next/link";
import { Shuffle } from "lucide-react";

import { MedalBadge } from "@/components/challenge/medal-badge";
import { MODES } from "@/data/stages/catalog";
import { CHALLENGE_LABELS, CHALLENGE_MODE_IDS, medalFor } from "@/lib/game/challenge-rules";
import { CHALLENGE_UNLOCK_STARS, isChallengeUnlocked, type StarMap } from "@/lib/game/progression";
import type { Progress } from "@/lib/progress-store";

const BOX = "mx-4 mt-3 block rounded-2xl border-b-[3px] border-cream-edge bg-card px-3 py-2";

export function MedalShelf({ stars, challengeBest }: { stars: StarMap; challengeBest: Progress["challengeBest"] }) {
  const unlocked = isChallengeUnlocked(stars);
  const title = <h2 className="font-display text-sm font-black text-[#2b6fa3]">チャレンジの メダル</h2>;

  if (!unlocked) {
    return (
      <section aria-label="チャレンジの メダル" className={BOX}>
        {title}
        <p className="mt-1 text-xs font-bold text-muted-foreground">★{CHALLENGE_UNLOCK_STARS}で ひらくよ</p>
      </section>
    );
  }

  return (
    <Link href="/challenge" aria-label="チャレンジの メダル" className={BOX}>
      {title}
      <ul className="mt-1.5 grid grid-cols-5 gap-1">
        {CHALLENGE_MODE_IDS.map((id) => {
          const medal = medalFor(id, challengeBest[id] ?? null);
          return (
            <li key={id} className="flex flex-col items-center gap-0.5">
              {medal ? (
                <MedalBadge medal={medal} size="sm" />
              ) : (
                <span
                  role="img"
                  aria-label={`${CHALLENGE_LABELS[id]} まだ`}
                  className="grid h-6 w-6 place-items-center rounded-full bg-muted text-xs font-black text-muted-foreground"
                >
                  {id === "mix" ? <Shuffle className="h-3.5 w-3.5" strokeWidth={3} /> : MODES[id].symbol}
                </span>
              )}
              <span className="text-[10px] font-bold text-muted-foreground">{CHALLENGE_LABELS[id]}</span>
            </li>
          );
        })}
      </ul>
    </Link>
  );
}
