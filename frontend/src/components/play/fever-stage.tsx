const FLAG_COLORS = ["#ffe14d", "#3dd6c6", "#ff3d8b", "#7ab8ff"];

/** フィーバー中の紫のステージ（背景）。main の中で一番後ろに置く */
export function FeverStage({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle_at_50%_30%,var(--fever-from)_0%,var(--fever-mid)_50%,var(--fever-to)_100%)]"
    >
      <div className="absolute -inset-1/2 animate-beams bg-[conic-gradient(from_0deg,transparent_0deg_10deg,rgba(255,255,255,0.12)_10deg_16deg,transparent_16deg_40deg,rgba(255,255,255,0.1)_40deg_46deg,transparent_46deg_80deg,rgba(255,255,255,0.12)_80deg_86deg,transparent_86deg_120deg)]" />
      <div className="absolute inset-x-0 top-[124px] flex justify-between px-1">
        {Array.from({ length: 13 }, (_, i) => (
          <i
            key={i}
            className="block h-0 w-0 border-x-[9px] border-t-[14px] border-x-transparent"
            style={{ borderTopColor: FLAG_COLORS[i % FLAG_COLORS.length] }}
          />
        ))}
      </div>
    </div>
  );
}

/** 「FEVER!」の文字。すべての上に重ねる */
export function FeverBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p
      role="status"
      className="pointer-events-none absolute inset-x-0 top-1/3 z-30 animate-fever-banner text-center font-display text-6xl font-black text-[#ffe14d] [text-shadow:0_4px_0_#b81e5d,0_0_18px_#ff3d8b]"
    >
      FEVER!
    </p>
  );
}
