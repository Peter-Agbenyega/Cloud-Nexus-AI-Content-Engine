import { ResultsClient } from "@/components/results/results-client";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  return <ResultsClient campaignId={campaignId} />;
}
