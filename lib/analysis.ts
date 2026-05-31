import {
  CampaignAnalysis,
  CampaignAnalysisBreakdown,
  EmailContent,
  FacebookAdsContent,
  GeneratedContent,
  LandingPageContent,
  ProductPageContent,
  TikTokContent,
} from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function collectCampaignText(content: GeneratedContent) {
  const sections: string[] = [];

  const tiktok = content["tiktok-reels"];
  if (tiktok) {
    const data = tiktok as TikTokContent;
    sections.push(
      data.hooks.map((hook) => hook.hook).join(" "),
      data.script.hook,
      data.script.problem,
      data.script.solution,
      data.script.proof,
      data.script.cta,
      data.script.onScreenText.join(" "),
      data.captionVariants.join(" "),
    );
  }

  const facebook = content["facebook-meta-ads"];
  if (facebook) {
    const data = facebook as FacebookAdsContent;
    sections.push(
      data.variants.map((variant) => [
        variant.headline,
        variant.primaryText.short,
        variant.primaryText.medium,
        variant.primaryText.long,
        variant.description,
        variant.ctaButton,
      ].join(" ")).join(" "),
    );
  }

  const productPage = content["product-page-copy"];
  if (productPage) {
    const data = productPage as ProductPageContent;
    sections.push(
      data.heroHeadline,
      data.heroSubheadline,
      data.benefitBullets.join(" "),
      data.socialProofPlacement,
      data.faqItems.map((item) => `${item.question} ${item.answer}`).join(" "),
    );
  }

  const email = content["email-promo"];
  if (email) {
    const data = email as EmailContent;
    sections.push(
      data.subjectLines.map((line) => `${line.subject} ${line.previewText}`).join(" "),
      data.body.opening,
      data.body.problem,
      data.body.solution,
      data.body.offer,
      data.body.cta,
      data.body.ps,
    );
  }

  const landingPage = content["landing-page"];
  if (landingPage) {
    const data = landingPage as LandingPageContent;
    sections.push(
      data.aboveFold.headline,
      data.aboveFold.subheadline,
      data.aboveFold.cta,
      data.problemSection.headline,
      data.problemSection.body,
      data.solutionSection.headline,
      data.solutionSection.body,
      data.proofSection.headline,
      data.proofSection.points.join(" "),
      data.offerStack.headline,
      data.offerStack.items.join(" "),
      data.finalCta.headline,
      data.finalCta.button,
      data.finalCta.urgency,
    );
  }

  const normalizedText = sections
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    text: normalizedText,
    lower: normalizedText.toLowerCase(),
    wordCount: normalizedText ? normalizedText.split(/\s+/).length : 0,
  };
}

function countMatches(lower: string, patterns: string[]) {
  return patterns.reduce((count, pattern) => {
    const matches = lower.match(new RegExp(pattern, "g"));
    return count + (matches?.length ?? 0);
  }, 0);
}

function buildSuggestions(breakdown: CampaignAnalysisBreakdown, lower: string) {
  const ranked = Object.entries(breakdown)
    .sort((a, b) => a[1] - b[1])
    .map(([key]) => key as keyof CampaignAnalysisBreakdown);

  const suggestions: string[] = [];

  for (const key of ranked) {
    if (suggestions.length === 3) break;

    if (key === "clarity" && breakdown.clarity < 80) {
      suggestions.push("Make the core outcome more explicit in headlines and CTAs so the offer is understood in one pass.");
      continue;
    }

    if (key === "urgency" && breakdown.urgency < 80) {
      suggestions.push("Add a concrete reason to act now, such as a deadline, limited availability, or an immediate payoff.");
      continue;
    }

    if (key === "differentiation" && breakdown.differentiation < 80) {
      suggestions.push("Call out what makes this offer distinct from common alternatives instead of relying on generic benefit language.");
      continue;
    }

    if (key === "trust" && breakdown.trust < 80) {
      suggestions.push("Strengthen proof with specific results, testimonials, guarantees, or objection-handling details.");
      continue;
    }
  }

  if (suggestions.length < 2 && !/(because|so you can|which means)/.test(lower)) {
    suggestions.push("Tie more features to buyer outcomes with direct cause-and-effect phrasing.");
  }

  if (suggestions.length < 2 && !/(testimonial|review|customers|users|guarantee|proof)/.test(lower)) {
    suggestions.push("Include concrete proof language earlier so credibility lands before the ask.");
  }

  return suggestions.slice(0, 3);
}

export function analyzeCampaign(content: GeneratedContent): CampaignAnalysis {
  const { lower, wordCount } = collectCampaignText(content);

  if (!wordCount) {
    return {
      score: 0,
      breakdown: {
        clarity: 0,
        urgency: 0,
        differentiation: 0,
        trust: 0,
      },
      suggestions: [
        "Generate campaign content first so the analysis engine has copy to evaluate.",
      ],
    };
  }

  const claritySignals = countMatches(lower, [
    "\\byou\\b",
    "\\byour\\b",
    "\\bget\\b",
    "\\bsolve\\b",
    "\\bresults?\\b",
    "\\bbenefit\\b",
    "\\bheadline\\b",
    "\\bcta\\b",
    "\\bhow\\b",
  ]);
  const urgencySignals = countMatches(lower, [
    "\\bnow\\b",
    "\\btoday\\b",
    "\\blimited\\b",
    "\\bdeadline\\b",
    "\\bbefore\\b",
    "\\bdon't wait\\b",
    "\\bimmediately\\b",
    "\\bfast\\b",
    "\\burgent\\b",
  ]);
  const differentiationSignals = countMatches(lower, [
    "\\bunique\\b",
    "\\bonly\\b",
    "\\bunlike\\b",
    "\\binstead of\\b",
    "\\bdifferent\\b",
    "\\bproprietary\\b",
    "\\bexclusive\\b",
    "\\bspecific\\b",
    "\\bdesigned for\\b",
  ]);
  const trustSignals = countMatches(lower, [
    "\\bproof\\b",
    "\\breview\\b",
    "\\btestimonial\\b",
    "\\btrusted\\b",
    "\\bguarantee\\b",
    "\\bresults?\\b",
    "\\bcase study\\b",
    "\\bcustomers?\\b",
    "\\bfaq\\b",
    "\\bverified\\b",
  ]);

  const clarity = clampScore(
    30
      + Math.min(40, claritySignals * 5)
      + Math.min(18, Math.floor(wordCount / 18))
      + (/(benefit|problem|solution|offer)/.test(lower) ? 12 : 0),
  );
  const urgency = clampScore(
    22
      + Math.min(54, urgencySignals * 9)
      + (/(limited|deadline|ends|today|now)/.test(lower) ? 14 : 0),
  );
  const differentiation = clampScore(
    24
      + Math.min(50, differentiationSignals * 9)
      + (/(unlike|only|exclusive|proprietary|designed for)/.test(lower) ? 16 : 0),
  );
  const trust = clampScore(
    26
      + Math.min(48, trustSignals * 8)
      + (/(faq|guarantee|review|testimonial|proof|customers)/.test(lower) ? 14 : 0),
  );

  const breakdown = { clarity, urgency, differentiation, trust };
  const score = clampScore((clarity + urgency + differentiation + trust) / 4);

  return {
    score,
    breakdown,
    suggestions: buildSuggestions(breakdown, lower),
  };
}
