import { z } from "zod";

import type { OfferFormData, PrimaryCta } from "@/lib/types";

export const StrategySchema = z.object({
  offerName: z.string().min(2).max(200),
  contentType: z.string().max(100).optional(),
  targetPlatform: z.string().max(100).optional(),
  campaignGoal: z.string().max(240).optional(),
  category: z.enum([
    "Physical Product",
    "Digital Product",
    "Service",
    "SaaS",
    "Course",
  ]),
  price: z.string().min(1).max(20),
  description: z.string().min(10).max(500),
  targetAudience: z.string().min(5).max(300),
  painPoint: z.string().min(10).max(500),
  benefits: z.array(z.string().min(2).max(200)).min(1).max(3),
  socialProof: z.string().max(300).optional(),
  cta: z.string().min(2).max(50),
  brandTone: z.string().min(2).max(50),
  styleDirection: z.string().max(300).optional(),
  keyConstraints: z.string().max(500).optional(),
  desiredOutputs: z.string().max(300).optional(),
  platforms: z.array(z.string()).min(1).max(8),
});

export const StrategyRequestSchema = z.object({
  offerData: StrategySchema,
});

export const GenerateSchema = z.object({
  offerData: StrategySchema,
  strategyBrief: z.record(z.string(), z.unknown()),
  platforms: z.array(z.string()).min(1).max(8),
});

export const SaveCampaignSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  offer_data: z.record(z.string(), z.unknown()),
  strategy_brief: z.record(z.string(), z.unknown()).optional(),
  generated_content: z.record(z.string(), z.unknown()).optional(),
  commerce_scores: z.record(z.string(), z.unknown()).optional(),
  platforms: z.array(z.string()).optional(),
});

type StrategyInput = z.infer<typeof StrategySchema>;

export function prepareOfferForValidation(value: unknown) {
  if (!value || typeof value !== "object") return value;

  const raw = value as Record<string, unknown>;

  return {
    ...raw,
    price: String(raw.price ?? ""),
    cta: raw.cta ?? raw.primaryCta,
  };
}

export function toOfferFormData(value: StrategyInput): OfferFormData {
  const benefits = [...value.benefits];
  while (benefits.length < 3) {
    benefits.push("Not specified");
  }

  return {
    sourceUrl: "",
    inputType: "manual",
    offerName: value.offerName,
    contentType: value.contentType,
    targetPlatform: value.targetPlatform,
    campaignGoal: value.campaignGoal,
    category: value.category,
    price: Number(value.price.replace(/[^0-9.]/g, "")) || 0,
    description: value.description,
    targetAudience: value.targetAudience,
    painPoint: value.painPoint,
    benefits: benefits.slice(0, 3) as [string, string, string],
    socialProof: value.socialProof ?? "",
    primaryCta: value.cta as PrimaryCta,
    brandTone: value.brandTone as OfferFormData["brandTone"],
    styleDirection: value.styleDirection,
    keyConstraints: value.keyConstraints,
    desiredOutputs: value.desiredOutputs,
    platforms: value.platforms as OfferFormData["platforms"],
  };
}

export function formatZodErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
