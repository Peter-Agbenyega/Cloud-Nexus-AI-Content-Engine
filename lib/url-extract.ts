import type { OfferCategory } from "@/lib/types";

export function extractPrice(text: string): string {
  const match = text.match(/[$£€]\s*(\d+(?:[.,]\d{2})?)/);
  return match ? match[0] : "";
}

export function extractBenefits(text: string): string[] {
  const sentences = text
    .split(/(?:\n|\.|\?|!)+/)
    .map((item) => item.replace(/^[\s•\-–—*]+/, "").trim())
    .filter((item) => item.length >= 18 && item.length <= 150);

  const benefitSignals = [
    "save",
    "reduce",
    "improve",
    "increase",
    "faster",
    "easier",
    "simple",
    "without",
    "built",
    "designed",
    "helps",
    "get",
    "create",
  ];

  const ranked = sentences.sort((a, b) => {
    const aScore = benefitSignals.filter((signal) => a.toLowerCase().includes(signal)).length;
    const bScore = benefitSignals.filter((signal) => b.toLowerCase().includes(signal)).length;
    return bScore - aScore;
  });

  return Array.from(new Set(ranked)).slice(0, 5);
}

export function inferCategory(url: string, content: string): OfferCategory {
  const value = `${url} ${content}`.toLowerCase();

  if (/(teachable|udemy|course|bootcamp|masterclass|lesson|curriculum)/.test(value)) {
    return "Course";
  }

  if (/(gumroad|template|ebook|download|notion|pdf|digital product|bundle)/.test(value)) {
    return "Digital Product";
  }

  if (/(saas|software|dashboard|platform|app|subscription|workflow|crm)/.test(value)) {
    return "SaaS";
  }

  if (/(service|agency|consulting|done-for-you|audit|strategy call|book a call)/.test(value)) {
    return "Service";
  }

  if (/(shopify|etsy|product|cart|shipping|size|material|color|variant)/.test(value)) {
    return "Physical Product";
  }

  return "Physical Product";
}

export function extractAudienceSignal(text: string): string {
  const match = text.match(
    /\b(?:perfect for|designed for|ideal for|built for|made for|for)\s+([^.!?\n]{12,160})/i,
  );

  return match?.[1]?.trim() ?? "";
}

export function extractSocialProof(text: string): string {
  const match = text.match(
    /([^.!?\n]*(?:reviews|customers|stars|rated|trusted by|featured in|loved by)[^.!?\n]{0,120})/i,
  );

  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}
