import { COMBO_SHOW_FROM } from "@/lib/game/play-rules";

export function ComboText({ combo }: { combo: number }) {
  if (combo < COMBO_SHOW_FROM) return null;
  return (
    <p
      key={combo}
      className="absolute top-3 right-3 animate-pop-in rounded-full bg-[#ff3d8b] px-3 py-0.5 font-display text-sm font-black text-white"
    >
      {combo}コンボ！
    </p>
  );
}
