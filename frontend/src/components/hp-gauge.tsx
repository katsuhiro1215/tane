import { Heart } from "lucide-react";

export function HpGauge({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    // Spra-Go(暗い背景に重ねるオーバーレイUI)から流用した際、白背景基調の
    // TaneではWhite-on-Whiteに近くなり数値が読めなくなっていたため、
    // 不透明な背景+濃色文字に調整した。
    <div
      className={`flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pr-3 pl-1.5 shadow-sm ${className ?? ""}`}
    >
      <Heart className="h-4 w-4 shrink-0 fill-rose-500 text-rose-500" />
      <div className="h-2.5 w-16 overflow-hidden rounded-full bg-rose-100 sm:w-24">
        <div
          className="h-full rounded-full bg-linear-to-r from-rose-500 to-rose-400 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground">
        {value}/{max}
      </span>
    </div>
  );
}
