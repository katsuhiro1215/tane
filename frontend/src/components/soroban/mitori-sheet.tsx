import { cn } from "@/lib/utils";

/** みとりざんの問題。検定用紙のように数を縦に並べ、右そろえで全部見せる */
export function MitoriSheet({ terms }: { terms: number[] }) {
  const label = `みとりざん ${terms.map((t, i) => (t < 0 ? `ひく ${-t}` : i === 0 ? `${t}` : `たす ${t}`)).join(" ")}`;
  return (
    <ul
      aria-label={label}
      className="flex w-full max-w-[14rem] flex-col rounded-xl bg-muted/60 px-3 py-1.5 font-display text-xl leading-tight font-black tabular-nums"
    >
      {terms.map((term, index) => (
        <li
          key={index}
          className={cn("flex items-baseline justify-between gap-2", term < 0 ? "text-destructive" : "text-foreground")}
        >
          <span aria-hidden className="w-4 text-center text-base">
            {term < 0 ? "−" : ""}
          </span>
          <span>{Math.abs(term)}</span>
        </li>
      ))}
    </ul>
  );
}
