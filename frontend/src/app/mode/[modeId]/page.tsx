import { notFound } from "next/navigation";

import { ModeScreenLoader } from "@/components/mode/mode-screen-loader";
import { isModeId } from "@/data/stages/catalog";
import { parseModeSearchParams } from "@/lib/mode-params";

export default async function ModePage({
  params,
  searchParams,
}: {
  params: Promise<{ modeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { modeId } = await params;
  if (!isModeId(modeId)) notFound();
  const { requestedStageId } = parseModeSearchParams(modeId, await searchParams);
  // あそびを切り替えたら、選んでいるステージを引き継がずに作り直す（grew は画面側で URL から読む）
  return <ModeScreenLoader key={modeId} modeId={modeId} requestedStageId={requestedStageId} />;
}
