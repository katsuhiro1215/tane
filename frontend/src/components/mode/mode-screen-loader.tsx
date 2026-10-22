"use client";

import dynamic from "next/dynamic";

import type { ModeId } from "@/data/stages/catalog";

// 最初に見せるステージは localStorage の★で決まるため、サーバーでは描かない
const ModeScreen = dynamic(() => import("@/components/mode/mode-screen").then((mod) => mod.ModeScreen), {
  ssr: false,
  loading: () => <div className="flex-1" />,
});

export function ModeScreenLoader(props: { modeId: ModeId }) {
  return <ModeScreen {...props} />;
}
