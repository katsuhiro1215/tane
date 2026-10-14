import { Crown } from "lucide-react";

import { FriendCell } from "@/components/friends/friend-cell";
import { MODES, stagesOfMode, type ModeId } from "@/data/stages/catalog";
import { modeBloom } from "@/lib/game/friends";
import { starsOf, type StarMap } from "@/lib/game/progression";

export function ModeFriends({
  mode,
  stars,
  garden,
  onOpen,
}: {
  mode: ModeId;
  stars: StarMap;
  garden: readonly string[];
  onOpen: (stageId: string) => void;
}) {
  const bloom = modeBloom(mode, stars);
  return (
    <section aria-labelledby={`friends-${mode}`} className="px-4 pt-4">
      <div className="mb-2 flex items-center gap-2">
        <h2 id={`friends-${mode}`} className="font-display text-lg font-black">
          {MODES[mode].label}
        </h2>
        {bloom.complete && (
          <span className="inline-flex animate-pop-in items-center gap-1 rounded-full border-b-[3px] border-[#c98f12] bg-accent px-2 py-0.5 font-display text-xs font-black text-accent-foreground">
            <Crown className="h-4 w-4" strokeWidth={2.5} />
            コンプリート！
          </span>
        )}
        <span className="ml-auto text-xs font-bold text-muted-foreground">
          はな {bloom.bloomed} / {bloom.total}
        </span>
      </div>
      {!bloom.complete && (
        <p className="-mt-1 mb-2 text-[11px] font-bold text-muted-foreground">あと {bloom.left}たいで コンプリート</p>
      )}
      <ul className="grid grid-cols-4 gap-2">
        {stagesOfMode(mode).map((stage) => (
          <li key={stage.id}>
            <FriendCell
              stage={stage}
              stars={starsOf(stars, stage.id)}
              inGarden={garden.includes(stage.id)}
              onOpen={() => onOpen(stage.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
