"use client";

import { SpruCharacter } from "@/components/spru-character";
import { StageListSection } from "@/components/stage-list-section";
import { FLASH_STAGES } from "@/data/problems/flash-stages";
import { STAGES } from "@/data/problems/stages";
import { useClearedStageIds } from "@/lib/storage";

const CHALK_OUTLINE = {
  textShadow:
    "2px 0 #FFFFFF, -2px 0 #FFFFFF, 0 2px #FFFFFF, 0 -2px #FFFFFF, 3px 3px 0 #C98A1B",
} as const;

// Spruの隣に置く小物(本)。ひよこ暗算の「学び」のモチーフを、
// Spru自体は差し替えずに小物で足す方針(company/tane/docs/参照)。
function BookProp() {
  return (
    <svg viewBox="0 0 48 36" className="h-9 w-12 drop-shadow-md">
      <path d="M4 4 C4 2 6 2 8 2 L22 2 L22 32 L8 32 C6 32 4 32 4 30 Z" fill="#F5B942" />
      <path d="M44 4 C44 2 42 2 40 2 L26 2 L26 32 L40 32 C42 32 44 32 44 30 Z" fill="#F5B942" />
      <path d="M22 2 L26 2 L26 32 L22 32 Z" fill="#C98A1B" />
      <path d="M8 8 H18 M8 13 H18 M8 18 H18" stroke="#C98A1B" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 8 H40 M30 13 H40 M30 18 H40" stroke="#C98A1B" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const clearedIds = useClearedStageIds();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 bg-[#FBEFDA] p-6">
      <h1
        className="mt-2 text-5xl text-[#2F6B4F]"
        style={{ fontFamily: "var(--font-hachi)", ...CHALK_OUTLINE }}
      >
        Tane
      </h1>

      <div className="flex w-full max-w-md flex-col gap-6">
        <StageListSection
          title="四則演算"
          stages={STAGES}
          clearedIds={clearedIds}
          hrefPrefix="/stage"
        />
        <StageListSection
          title="フラッシュ暗算"
          stages={FLASH_STAGES}
          clearedIds={clearedIds}
          hrefPrefix="/flash"
        />
      </div>

      <div className="mt-2 flex items-end gap-2">
        <SpruCharacter stage="tree" className="h-20 w-20" />
        <BookProp />
      </div>
    </main>
  );
}
