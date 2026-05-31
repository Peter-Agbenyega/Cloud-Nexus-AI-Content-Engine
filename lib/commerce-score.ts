import { CommerceScores, OfferFormData, StrategyBrief } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/constants";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateCommerceScores(
  offerData: OfferFormData,
  strategyBrief: StrategyBrief,
): CommerceScores {
  const offerClarityRaw =
    (offerData.offerName.trim() ? 28 : 0) +
    (offerData.price > 0 ? 24 : 0) +
    (offerData.description.trim().length >= 40 ? 24 : offerData.description.trim() ? 16 : 0) +
    (offerData.benefits.filter(Boolean).length === 3 ? 24 : 12);

  const emotionalHookLength = strategyBrief.primaryEmotionalHook.trim().length;
  const hookStrengthRaw =
    emotionalHookLength > 60
      ? 88
      : emotionalHookLength > 35
        ? 76
        : emotionalHookLength > 20
          ? 66
          : 54;

  const audienceSpecificityWords = offerData.targetAudience.trim().split(/\s+/).length;
  const audienceFitRaw =
    audienceSpecificityWords >= 7
      ? 90
      : audienceSpecificityWords >= 5
        ? 78
        : audienceSpecificityWords >= 3
          ? 66
          : 50;

  const buyingIntentRaw =
    offerData.primaryCta === strategyBrief.recommendedCTA
      ? 90
      : offerData.price <= 100 && offerData.primaryCta === "Buy Now"
        ? 78
        : offerData.primaryCta === "Learn More"
          ? 60
          : 70;

  const selectedLabels = offerData.platforms.map((platform) => PLATFORM_LABELS[platform]);
  const matchedChannels = selectedLabels.filter((label) =>
    strategyBrief.bestChannels.some((channel) =>
      channel.toLowerCase().includes(label.toLowerCase().split("/")[0].toLowerCase()),
    ),
  ).length;
  const channelMatchRaw =
    offerData.platforms.length === 0
      ? 0
      : 45 + (matchedChannels / offerData.platforms.length) * 55;

  const metrics = [
    {
      key: "offerClarity" as const,
      label: "Offer Clarity",
      score: clampScore(offerClarityRaw),
      reason: "Measures completeness of the offer fundamentals and benefit framing.",
    },
    {
      key: "hookStrength" as const,
      label: "Hook Strength",
      score: clampScore(hookStrengthRaw),
      reason: "Based on how specific and emotionally charged the strategic hook is.",
    },
    {
      key: "audienceFit" as const,
      label: "Audience Fit",
      score: clampScore(audienceFitRaw),
      reason: "Rewards specificity in the audience description and buying context.",
    },
    {
      key: "buyingIntent" as const,
      label: "Buying Intent",
      score: clampScore(buyingIntentRaw),
      reason: "Checks CTA strength against the offer type and price alignment.",
    },
    {
      key: "channelMatch" as const,
      label: "Channel Match",
      score: clampScore(channelMatchRaw),
      reason: "Compares the selected platforms to the channels recommended by strategy.",
    },
  ];

  const overall = clampScore(
    metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length,
  );

  return {
    overall,
    status: overall >= 80 ? "green" : overall >= 60 ? "amber" : "red",
    metrics,
  };
}
