import { SorobanPlayerLoader } from "@/components/soroban/soroban-player-loader";
import { STAGES } from "@/data/stages/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return STAGES.filter((stage) => stage.kind === "soroban").map((stage) => ({ stageId: stage.id }));
}

export default async function SorobanPage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  return <SorobanPlayerLoader stageId={stageId} />;
}
