import { Star } from "lucide-react";

import { Panel } from "@/components/app/panel";
import type { ParentSummary } from "@/lib/account/parent-summary";

export function ParentCard({ name, summary }: { name: string; summary: ParentSummary }) {
  return (
    <Panel className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-black text-primary">{name}</h2>
      <p className="text-sm font-bold text-muted-foreground">
        さいきん あそんだ日：{summary.lastPlayed ?? "まだ ない"}／ こんしゅう {summary.daysThisWeek} 日
      </p>
      <ul className="flex flex-col gap-1">
        {summary.modes.map((mode) => (
          <li key={mode.modeId} className="flex items-center justify-between font-display text-sm font-black">
            <span>{mode.label}</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {mode.reached && <span>{mode.reached}</span>}
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-accent" fill="currentColor" />
                {mode.earned}/{mode.max}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {summary.stuck.length > 0 && (
        <div className="rounded-2xl bg-muted p-3">
          <p className="text-sm font-black">とまっている ところ</p>
          <ul className="mt-1 list-disc pl-4 text-sm font-bold text-muted-foreground">
            {summary.stuck.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
