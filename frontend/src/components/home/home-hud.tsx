import { Sprout, Star } from "lucide-react";

import { SoundToggle } from "@/components/app/sound-toggle";
import { friendsCount, totalStars, type StarMap } from "@/lib/game/progression";

export function HomeHud({ stars }: { stars: StarMap }) {
  return (
    <header className="flex items-center gap-2 px-3 pt-3">
      <p className="mr-auto font-display text-2xl font-black text-primary">
        T<span className="text-cta-to">a</span>ne
      </p>
      <span className="flex items-center gap-1 rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black">
        <Star className="h-4 w-4 text-accent" fill="currentColor" aria-label="ほし" /> {totalStars(stars)}
      </span>
      <span className="flex items-center gap-1 rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black">
        <Sprout className="h-4 w-4 text-leaf" aria-label="なかま" /> {friendsCount(stars)}
      </span>
      <SoundToggle />
    </header>
  );
}
