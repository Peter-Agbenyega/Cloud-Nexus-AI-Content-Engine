import { PLATFORM_LABELS } from "@/lib/constants";
import { CampaignRecord, PlatformKey } from "@/lib/types";

export function buildCampaignExport(record: CampaignRecord) {
  const sections = [
    `CNACE Campaign Pack`,
    ``,
    `Campaign: ${record.title}`,
    `Created: ${new Date(record.created_at).toLocaleString()}`,
    ``,
    `=== Offer Brief ===`,
    `Offer: ${record.offer_data.offerName}`,
    `Category: ${record.offer_data.category}`,
    `Price: $${record.offer_data.price}`,
    `Description: ${record.offer_data.description}`,
    `Audience: ${record.offer_data.targetAudience}`,
    `Pain Point: ${record.offer_data.painPoint}`,
    `Benefits: ${record.offer_data.benefits.join(" | ")}`,
    `Social Proof: ${record.offer_data.socialProof || "None provided"}`,
    `Primary CTA: ${record.offer_data.primaryCta}`,
    `Brand Tone: ${record.offer_data.brandTone}`,
    `Platforms: ${record.offer_data.platforms.map((platform) => PLATFORM_LABELS[platform]).join(", ")}`,
    ``,
    `=== Strategy Brief ===`,
    JSON.stringify(record.strategy_brief, null, 2),
    ``,
    `=== Commerce Scores ===`,
    JSON.stringify(record.commerce_scores, null, 2),
    ``,
    `=== Generated Content ===`,
  ];

  for (const [platform, content] of Object.entries(record.generated_content) as [
    PlatformKey,
    unknown,
  ][]) {
    sections.push(`-- ${PLATFORM_LABELS[platform]} --`);
    sections.push(JSON.stringify(content, null, 2));
    sections.push(``);
  }

  return sections.join("\n");
}
