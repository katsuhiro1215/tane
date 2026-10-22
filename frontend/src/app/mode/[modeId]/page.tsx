import { notFound } from "next/navigation";

import { ModeScreenLoader } from "@/components/mode/mode-screen-loader";
import { isModeId, MODE_IDS } from "@/data/stages/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return MODE_IDS.map((modeId) => ({ modeId }));
}

export default async function ModePage({ params }: { params: Promise<{ modeId: string }> }) {
  const { modeId } = await params;
  if (!isModeId(modeId)) notFound();
  // あそびを切り替えたら、選んでいるステージを引き継がずに作り直す（stage・grew は画面側で URL から読む）
  return <ModeScreenLoader key={modeId} modeId={modeId} />;
}
