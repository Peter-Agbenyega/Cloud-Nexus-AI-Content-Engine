import { jsPDF } from "jspdf";

import { PLATFORM_LABELS } from "@/lib/constants";
import {
  CampaignRecord,
  ContentBrief,
  ContentPackageContent,
  ContentCalendarContent,
  FacebookAdsContent,
  PlatformKey,
} from "@/lib/types";

type Campaign = CampaignRecord;

function stringifyContent(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function cleanSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "campaign";
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatContentBrief(brief: ContentBrief) {
  return [
    `Project Title: ${brief.projectTitle}`,
    `Content Type: ${brief.contentType}`,
    `Target Platform: ${brief.targetPlatform}`,
    `Campaign Goal: ${brief.campaignGoal}`,
    `Target Audience: ${brief.targetAudience}`,
    `Main Offer: ${brief.mainOffer}`,
    `Brand Tone: ${brief.brandTone}`,
    `Style Direction: ${brief.styleDirection}`,
    `Key Constraints: ${brief.keyConstraints}`,
    `CTA: ${brief.cta}`,
    `Desired Outputs: ${brief.desiredOutputs}`,
  ].join("\n");
}

function formatContentPackage(contentPackage: ContentPackageContent) {
  return [
    "Strategy Summary",
    contentPackage.strategySummary,
    "",
    "Main Copy",
    contentPackage.mainCopy,
    "",
    "Short Social Caption",
    contentPackage.shortSocialCaption,
    "",
    "AI Image Prompt",
    contentPackage.aiImagePrompt,
    "",
    "AI Video Prompt",
    contentPackage.aiVideoPrompt,
    "",
    "Voiceover Script",
    contentPackage.voiceoverScript,
    "",
    "Music Prompt",
    contentPackage.musicPrompt,
    "",
    "Human Review Checklist",
    contentPackage.humanReviewChecklist.map((item, index) => `${index + 1}. ${item}`).join("\n"),
  ].join("\n");
}

export function exportAsPDF(campaign: Campaign): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  function addFooter() {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Cloud Nexus AI Studio", margin, pageHeight - 24);
  }

  function addText(text: string, size = 10, bold = false) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(20);
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    lines.forEach((line: string) => {
      if (y > pageHeight - 56) {
        addFooter();
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size + 5;
    });
    y += 6;
  }

  addText(campaign.title, 24, true);
  addText(`Campaign Pack · ${new Date(campaign.created_at).toLocaleDateString()}`, 12);
  y += 18;

  addText("Offer Brief", 16, true);
  addText(`Offer: ${campaign.offer_data.offerName}`);
  addText(`Category: ${campaign.offer_data.category}`);
  addText(`Price: $${campaign.offer_data.price}`);
  addText(`Audience: ${campaign.offer_data.targetAudience}`);
  addText(`Description: ${campaign.offer_data.description}`);

  addText("Strategy Brief", 16, true);
  addText(campaign.strategy_brief.positioningSummary);
  addText(`Primary hook: ${campaign.strategy_brief.primaryEmotionalHook}`);
  addText(`Recommended CTA: ${campaign.strategy_brief.recommendedCTA}`);

  if (campaign.generated_content.contentBrief) {
    addText("Content Brief", 16, true);
    addText(formatContentBrief(campaign.generated_content.contentBrief), 9);
  }

  if (campaign.generated_content.contentPackage) {
    addText("Content Package", 16, true);
    addText(formatContentPackage(campaign.generated_content.contentPackage), 9);
  }

  Object.entries(campaign.generated_content).forEach(([platform, content]) => {
    if (platform === "contentBrief" || platform === "contentPackage") return;
    addText(PLATFORM_LABELS[platform as PlatformKey] ?? platform, 16, true);
    addText(stringifyContent(content), 9);
  });

  addFooter();
  return doc.output("blob");
}

export function exportAsText(campaign: Campaign): string {
  const sections = [
    "Cloud Nexus AI Studio Campaign Pack",
    "",
    `Campaign: ${campaign.title}`,
    `Created: ${new Date(campaign.created_at).toLocaleString()}`,
    "",
    "=== Offer Brief ===",
    `Offer: ${campaign.offer_data.offerName}`,
    `Category: ${campaign.offer_data.category}`,
    `Price: $${campaign.offer_data.price}`,
    `Description: ${campaign.offer_data.description}`,
    `Audience: ${campaign.offer_data.targetAudience}`,
    `Pain Point: ${campaign.offer_data.painPoint}`,
    `Benefits: ${campaign.offer_data.benefits.join(" | ")}`,
    `Social Proof: ${campaign.offer_data.socialProof || "None provided"}`,
    `Primary CTA: ${campaign.offer_data.primaryCta}`,
    `Brand Tone: ${campaign.offer_data.brandTone}`,
    `Platforms: ${campaign.offer_data.platforms.map((platform) => PLATFORM_LABELS[platform]).join(", ")}`,
    "",
    "=== Strategy Brief ===",
    stringifyContent(campaign.strategy_brief),
    "",
    "=== Commerce Scores ===",
    stringifyContent(campaign.commerce_scores),
    "",
  ];

  if (campaign.generated_content.contentBrief) {
    sections.push("=== Content Brief ===");
    sections.push(formatContentBrief(campaign.generated_content.contentBrief));
    sections.push("");
  }

  if (campaign.generated_content.contentPackage) {
    sections.push("=== Content Package ===");
    sections.push(formatContentPackage(campaign.generated_content.contentPackage));
    sections.push("");
  }

  sections.push("=== Generated Content ===");

  for (const [platform, content] of Object.entries(campaign.generated_content)) {
    if (platform === "contentBrief" || platform === "contentPackage") continue;
    sections.push(`-- ${PLATFORM_LABELS[platform as PlatformKey] ?? platform} --`);
    sections.push(stringifyContent(content));
    sections.push("");
  }

  return sections.join("\n");
}

export function exportAsContentCalendar(campaign: Campaign): string {
  const calendar = campaign.generated_content["content-calendar"] as ContentCalendarContent | undefined;
  const rows = ["Day,Date,Platform,Content Type,Hook,Notes,Hashtags"];

  if (!calendar?.calendar?.length) {
    return rows.join("\n");
  }

  calendar.calendar.forEach((item) => {
    rows.push([
      item.day,
      csvCell(item.date),
      csvCell(item.platform),
      csvCell(item.contentType),
      csvCell(item.hook),
      csvCell(item.notes),
      csvCell(item.hashtags.join(" ")),
    ].join(","));
  });

  return rows.join("\n");
}

export function exportAsMetaAds(campaign: Campaign): string {
  const ads = campaign.generated_content["facebook-meta-ads"] as FacebookAdsContent | undefined;
  const sections = [`Campaign Name: ${campaign.title}`, ""];

  if (!ads?.variants?.length) {
    sections.push("No Facebook/Meta ad variants found.");
    return sections.join("\n");
  }

  ads.variants.forEach((variant, index) => {
    sections.push(`Ad Set Name: ${campaign.title} - Set ${index + 1}`);
    sections.push(`Ad Name: ${variant.headline}`);
    sections.push(`Headline: ${variant.headline}`);
    sections.push(`Primary Text Short: ${variant.primaryText.short}`);
    sections.push(`Primary Text Medium: ${variant.primaryText.medium}`);
    sections.push(`Primary Text Long: ${variant.primaryText.long}`);
    sections.push(`Description: ${variant.description}`);
    sections.push(`CTA: ${variant.ctaButton}`);
    sections.push("");
  });

  return sections.join("\n");
}

export function getExportFilename(campaign: Campaign, format: string): string {
  return `${cleanSlug(campaign.offer_data.offerName || campaign.title)}-campaign.${format}`;
}

export const buildCampaignExport = exportAsText;
