"use client";

import { useState } from "react";

import { ABACUS_COLUMNS, ABACUS_ONE_BEADS, emptyColumn, tapOne, toggleFive, type AbacusColumn } from "@/lib/game/abacus";
import { cn } from "@/lib/utils";

/** 珠はひし形（菱形）。clip-pathで六角のレンズ形にし、木目っぽいグラデーションで立体感を出す */
const BEAD_SHAPE = { clipPath: "polygon(50% 0%, 88% 24%, 88% 76%, 50% 100%, 12% 76%, 12% 24%)" };
const BEAD =
  "h-5 w-9 border border-amber-950/70 bg-[linear-gradient(155deg,#fde9a8_0%,#eab63a_32%,#c6811d_68%,#7a4a10_100%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),0_1px_2px_rgba(0,0,0,0.35)] transition-transform active:scale-95";

/** 軸（心棒）。枠の上から下まで、珠の後ろに1本通す */
function Rod() {
  return (
    <span
      aria-hidden
      className="absolute top-0 bottom-0 left-1/2 w-[3px] -translate-x-1/2 bg-[linear-gradient(90deg,#8a7250,#d8c69a,#8a7250)] opacity-80"
    />
  );
}

/** ごだま（5）の列。動いているとき、はり側（下）に寄る */
function UpperCell({ five, onToggle }: { five: boolean; onToggle: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col items-center">
      <Rod />
      <div className={cn("flex h-8 w-full flex-col items-center", five ? "justify-end" : "justify-start")}>
        <button
          type="button"
          aria-label="ごだま（5）"
          aria-pressed={five}
          onClick={onToggle}
          style={BEAD_SHAPE}
          className={cn(BEAD, "relative")}
        />
      </div>
    </div>
  );
}

// いちだま1こぶんの高さ・間隔（px）。枠の高さぶん、はり側⇔いちばん下まではっきり動く距離を作る
const ONE_BEAD_PX = 20;
const ONE_GAP_PX = 3;
const ONE_PITCH_PX = ONE_BEAD_PX + ONE_GAP_PX;
const LOWER_TRACK_PX = 132;

/** rank（1=はりに近い）の珠が、動いているときの上からの位置 */
function activeTopPx(rank: number): number {
  return (rank - 1) * ONE_PITCH_PX;
}

/** rank の珠が、動いていない（休んでいる）ときの上からの位置。4この珠が枠の下に並ぶ */
function restTopPx(rank: number): number {
  return LOWER_TRACK_PX - ONE_BEAD_PX - (ABACUS_ONE_BEADS - rank) * ONE_PITCH_PX;
}

/** いちだま（1×4）の列。はりに近い番号から動く。珠ごとに場所が決まっていて、はり側⇔枠の下まで1枚ずつスライドする */
function LowerCell({ ones, onTap }: { ones: number; onTap: (rank: number) => void }) {
  return (
    <div className="relative flex-1" style={{ height: LOWER_TRACK_PX }}>
      <Rod />
      {Array.from({ length: ABACUS_ONE_BEADS }, (_, i) => i + 1).map((rank) => {
        const active = rank <= ones;
        return (
          <button
            key={rank}
            type="button"
            aria-label={`いちだま ${rank}こめ${active ? "（動いている）" : ""}`}
            aria-pressed={active}
            onClick={() => onTap(rank)}
            style={{ ...BEAD_SHAPE, top: active ? activeTopPx(rank) : restTopPx(rank) }}
            className={cn(BEAD, "absolute left-1/2 -translate-x-1/2 transition-[top] duration-200 ease-out")}
          />
        );
      })}
    </div>
  );
}

/** はり（横木）。3けたごとに位どりの点を付ける（1の位から3つおき） */
function Beam({ columns }: { columns: number }) {
  const dotAt = (i: number) => (columns - 1 - i) % 3 === 0;
  return (
    <div className="relative h-3 w-full rounded-[2px] bg-[linear-gradient(180deg,#4a3420,#241509)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="absolute inset-0 flex">
        {Array.from({ length: columns }, (_, i) => (
          <span key={i} className="relative flex flex-1 items-center justify-center">
            {dotAt(i) && <span aria-hidden className="h-1 w-1 rounded-full bg-amber-100/90" />}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 画面の中のそろばん。採点には使わない、計算用のおもちゃ。タップで珠を動かせる */
export function SorobanAbacus({ columns = ABACUS_COLUMNS }: { columns?: number }) {
  const [state, setState] = useState<AbacusColumn[]>(() => Array.from({ length: columns }, emptyColumn));

  function update(index: number, next: AbacusColumn) {
    setState((prev) => prev.map((c, i) => (i === index ? next : c)));
  }

  return (
    <div
      aria-label="そろばん（自分で けいさんする どうぐ）"
      className="relative w-full max-w-[23rem] rounded-md border-4 border-[#2b1a0c] bg-[linear-gradient(180deg,#5a3c1c,#3c260e)] p-[3px] shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
    >
      {/* つまみ（本物のそろばんの、リセット用のつまみを模した飾り） */}
      <span aria-hidden className="absolute -top-1.5 left-3 h-3 w-5 rounded-sm border border-amber-950/70 bg-[linear-gradient(180deg,#eab63a,#a06c1c)]" />
      <div className="flex flex-col rounded-[2px] bg-[#f6ecd4] px-1.5 pt-2 pb-1.5">
        <div className="flex gap-px">
          {state.map((column, i) => (
            <UpperCell key={i} five={column.five} onToggle={() => update(i, toggleFive(column))} />
          ))}
        </div>
        <Beam columns={columns} />
        <div className="flex gap-px">
          {state.map((column, i) => (
            <LowerCell key={i} ones={column.ones} onTap={(rank) => update(i, tapOne(column, rank))} />
          ))}
        </div>
      </div>
    </div>
  );
}
