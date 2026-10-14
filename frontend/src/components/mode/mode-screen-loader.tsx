"use client";

import dynamic from "next/dynamic";

import type { ModeId } from "@/data/stages/catalog";
import type { ModeSearch } from "@/lib/mode-params";

// 最初に見せるステージは localStorage の★で決まるため、サーバーでは描かない
const ModeScreen = dynamic(() => import("@/components/mode/mode-screen").then((mod) => mod.ModeScreen), {
  ssr: false,
  loading: () => <div className="flex-1" />,
});

export function ModeScreenLoader(props: { modeId: ModeId } & Pick<ModeSearch, "requestedStageId">) {
  return <ModeScreen {...props} />;
}
