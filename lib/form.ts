import { normalizeReliableOfferInput } from "@/lib/autoFill";
import { OfferFormData, OfferFormInput, StrategyBrief } from "@/lib/types";

export function normalizeOfferInput(input: OfferFormInput): OfferFormData {
  return normalizeReliableOfferInput(input);
}

export function validateStep(input: OfferFormInput, step: number): string[] {
  if (step === 1) {
    const errors = [];
    if (!input.offerName.trim()) errors.push("Offer name is required.");
    if (!input.price || Number(input.price) <= 0) {
      errors.push("Enter a valid price point.");
    }
    if (!input.description.trim()) errors.push("Brief description is required.");
    if (input.description.trim().length > 200) {
      errors.push("Brief description must stay under 200 characters.");
    }
    return errors;
  }

  if (step === 2) {
    const errors = [];
    if (!input.targetAudience.trim()) errors.push("Target audience is required.");
    if (!input.painPoint.trim()) errors.push("Core pain point is required.");
    if (input.benefits.some((benefit) => !benefit.trim())) {
      errors.push("All three benefit fields are required.");
    }
    return errors;
  }

  if (step === 3) {
    return input.platforms.length === 0
      ? ["Select at least one platform for generation."]
      : [];
  }

  return [];
}

export function validateNormalizedOfferData(input: OfferFormData): string[] {
  const errors: string[] = [];

  if (!input.offerName.trim()) errors.push("Offer name is required.");
  if (!Number.isFinite(input.price) || input.price <= 0) errors.push("Enter a valid price point.");
  if (!input.description.trim()) errors.push("Brief description is required.");
  if (!input.targetAudience.trim()) errors.push("Target audience is required.");
  if (!input.painPoint.trim()) errors.push("Core pain point is required.");
  if (input.benefits.some((benefit) => !benefit.trim())) errors.push("All three benefit fields are required.");
  if (input.platforms.length === 0) errors.push("Select at least one platform for generation.");

  return errors;
}

export function isStrategyBrief(value: unknown): value is StrategyBrief {
  if (!value || typeof value !== "object") return false;

  const brief = value as Partial<StrategyBrief>;

  return (
    typeof brief.positioningSummary === "string" &&
    Array.isArray(brief.topAngles) &&
    brief.topAngles.length > 0 &&
    typeof brief.primaryEmotionalHook === "string" &&
    Array.isArray(brief.topObjections) &&
    brief.topObjections.length > 0 &&
    typeof brief.recommendedCTA === "string" &&
    Array.isArray(brief.bestChannels) &&
    typeof brief.audienceAwarenessLevel === "string" &&
    typeof brief.contentPriority === "string"
  );
}
