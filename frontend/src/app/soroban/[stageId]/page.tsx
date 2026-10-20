import { SorobanPlayerLoader } from "@/components/soroban/soroban-player-loader";

export default async function SorobanPage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  return <SorobanPlayerLoader stageId={stageId} />;
}
