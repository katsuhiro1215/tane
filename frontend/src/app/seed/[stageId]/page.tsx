import { SeedPlayerLoader } from "@/components/seed/seed-player-loader";

export default async function SeedPage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  return <SeedPlayerLoader stageId={stageId} />;
}
