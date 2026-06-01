import {
  OfferFormData,
  OfferFormInput,
  PlatformKey,
  PrimaryCta,
} from "@/lib/types";

const DEFAULT_DESCRIPTION = "A clear offer designed to solve a specific problem without extra friction.";
const DEFAULT_AUDIENCE = "Everyday buyers looking for a practical, reliable solution.";
const DEFAULT_PAIN = "They are tired of clunky options and want a simpler, more reliable way to get the result.";
const DEFAULT_BENEFITS: [string, string, string] = [
  "Makes the value easier to understand and act on",
  "Cuts wasted time and second-guessing",
  "Feels credible, practical, and easy to try",
];

function safeText(value: string | undefined) {
  return (value ?? "").trim();
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function combinedSeed(form: Pick<OfferFormInput, "offerName" | "description" | "category">) {
  return `${safeText(form.offerName)} ${safeText(form.description)} ${form.category}`.toLowerCase();
}

function compactOfferLabel(offerName: string) {
  const trimmed = safeText(offerName);
  if (!trimmed) return "this offer";
  return trimmed.length > 48 ? "this offer" : trimmed;
}

function audiencePrefix(audience: string) {
  const trimmed = safeText(audience);
  if (!trimmed) return "They";
  const words = trimmed.split(/\s+/);
  return words.length > 8 ? "They" : trimmed;
}

function categoryAudienceFallback(category: OfferFormInput["category"]) {
  if (category === "Physical Product") return "Practical buyers who want a useful upgrade they can trust in daily use.";
  if (category === "SaaS") return "Lean teams that need a clearer workflow without adding more manual work.";
  if (category === "Service") return "Founder-led teams that need expert execution without another project to manage.";
  if (category === "Digital Product") return "Creators and operators who want a reusable shortcut they can act on quickly.";
  if (category === "Course") return "Learners who want a practical path from confusion to confident execution.";
  return DEFAULT_AUDIENCE;
}

export function inferPlatforms(category: OfferFormInput["category"]): PlatformKey[] {
  if (category === "Service") return ["facebook-meta-ads", "landing-page", "email-promo"];
  if (category === "SaaS") return ["facebook-meta-ads", "landing-page", "email-promo", "product-page-copy"];
  if (category === "Course") return ["tiktok-reels", "facebook-meta-ads", "landing-page", "email-promo"];
  return ["tiktok-reels", "facebook-meta-ads", "product-page-copy"];
}

export function inferAudience(form: Pick<OfferFormInput, "offerName" | "description" | "category">) {
  const seed = combinedSeed(form);
  if (seed.includes("eco") || seed.includes("sustain")) {
    return "Eco-conscious shoppers who want a practical upgrade without giving up quality.";
  }
  if (seed.includes("team") || seed.includes("founder") || seed.includes("business")) {
    return "Lean teams that need a faster solution without adding more complexity.";
  }
  if (seed.includes("creator") || seed.includes("course") || seed.includes("digital")) {
    return "Creators and operators who want a faster path from idea to launch.";
  }
  if (safeText(form.offerName)) {
    return `People looking for ${toTitleCase(safeText(form.offerName))} who want a practical option that feels easy to trust.`;
  }
  return categoryAudienceFallback(form.category);
}

export function inferPain(form: Pick<OfferFormInput, "offerName" | "description" | "targetAudience"> & Partial<Pick<OfferFormInput, "category">>) {
  const audience = safeText(form.targetAudience)
    || inferAudience({ offerName: form.offerName, description: form.description, category: form.category || "Physical Product" });
  const subject = audiencePrefix(audience);

  if (safeText(form.description).toLowerCase().includes("time")) {
    return `${subject} are wasting time on clunky workarounds and want a faster, more dependable option.`;
  }

  if (form.category === "SaaS") {
    return `${subject} are stuck with manual steps, scattered data, or slow handoffs that make growth harder to manage.`;
  }

  if (form.category === "Service") {
    return `${subject} know the work matters, but it keeps slipping because nobody has the time or specialist focus to own it.`;
  }

  if (form.category === "Physical Product") {
    return `${subject} are tired of buying options that look promising online but feel flimsy, overhyped, or forgettable in daily use.`;
  }

  return `${subject} are tired of piecing together weak options and want something that feels simpler and more dependable.`;
}

export function inferBenefits(form: Pick<OfferFormInput, "offerName" | "description" | "painPoint"> & Partial<Pick<OfferFormInput, "category">>): [string, string, string] {
  const seed = compactOfferLabel(form.offerName);
  const description = safeText(form.description);
  const pain = safeText(form.painPoint);

  if (form.category === "SaaS") {
    return [
      `${toTitleCase(seed)} makes the workflow easier to see and manage`,
      "It reduces repetitive manual steps before they slow the team down",
      "It helps teams scale the process without sacrificing consistency",
    ].map((item, index) => (item.length > 110 ? DEFAULT_BENEFITS[index] : item)) as [string, string, string];
  }

  if (form.category === "Service") {
    return [
      `${toTitleCase(seed)} gives the buyer expert execution without extra coordination`,
      "It turns an important but stalled project into a clear deliverable",
      "It creates momentum faster than hiring, briefing, and managing from scratch",
    ].map((item, index) => (item.length > 110 ? DEFAULT_BENEFITS[index] : item)) as [string, string, string];
  }

  if (form.category === "Physical Product") {
    return [
      `${toTitleCase(seed)} feels useful and credible from the first use`,
      "It gives buyers a practical reason to choose it over a cheaper substitute",
      "It makes the purchase feel worth repeating instead of instantly replaceable",
    ].map((item, index) => (item.length > 110 ? DEFAULT_BENEFITS[index] : item)) as [string, string, string];
  }

  return [
    `${toTitleCase(seed)} gives buyers a clearer path to the result`,
    description ? `It reduces hesitation around ${description.toLowerCase()}` : "It reduces wasted time and unnecessary guesswork",
    pain ? "It makes the problem feel easier to solve without adding friction" : "It feels practical, credible, and easy to try",
  ].map((item, index) => (item.length > 110 ? DEFAULT_BENEFITS[index] : item)) as [string, string, string];
}

export function inferCTA(form: Pick<OfferFormInput, "category" | "benefits" | "description">): PrimaryCta {
  const text = `${form.benefits.join(" ")} ${safeText(form.description)}`.toLowerCase();
  if (form.category === "Service" || text.includes("team") || text.includes("call")) return "Book a Call";
  if (form.category === "SaaS" || text.includes("trial") || text.includes("sign up")) return "Sign Up";
  if (form.category === "Digital Product" || form.category === "Course" || text.includes("download")) return "Download";
  if (form.category === "Physical Product" || text.includes("buy")) return "Buy Now";
  return "Learn More";
}

export function autoFillForm(form: OfferFormInput): OfferFormInput {
  const category = form.category || "Physical Product";
  const next: OfferFormInput = {
    sourceUrl: safeText(form.sourceUrl),
    inputType: form.inputType || "manual",
    offerName: safeText(form.offerName),
    category,
    price: safeText(form.price) || "29",
    description: safeText(form.description),
    targetAudience: safeText(form.targetAudience),
    painPoint: safeText(form.painPoint),
    benefits: [
      safeText(form.benefits?.[0]),
      safeText(form.benefits?.[1]),
      safeText(form.benefits?.[2]),
    ],
    socialProof: safeText(form.socialProof),
    primaryCta: form.primaryCta || "Buy Now",
    brandTone: form.brandTone || "Professional",
    platforms: form.platforms.length > 0 ? form.platforms : inferPlatforms(category),
  };

  if (!next.description) {
    next.description = category === "SaaS"
      ? "A software offer that makes a messy workflow clearer, faster, and easier to manage."
      : category === "Service"
        ? "A service offer that gets an important job handled without adding more coordination."
        : category === "Physical Product"
          ? "A physical product that gives buyers a more useful, reliable upgrade in everyday use."
          : category === "Digital Product"
            ? "A digital product that gives buyers a reusable shortcut to a clear result."
            : category === "Course"
              ? "A guided course that helps buyers move from confusion to confident execution."
              : DEFAULT_DESCRIPTION;
  }
  if (!next.targetAudience) {
    next.targetAudience = inferAudience(next);
  }
  if (!next.painPoint) {
    next.painPoint = inferPain(next);
  }
  if (!next.benefits[0]) {
    next.benefits = inferBenefits(next);
  } else {
    const inferred = inferBenefits(next);
    next.benefits = next.benefits.map((benefit, index) => benefit || inferred[index]) as [string, string, string];
  }
  if (!next.primaryCta) {
    next.primaryCta = inferCTA(next);
  }
  if (!next.platforms.length) {
    next.platforms = inferPlatforms(next.category);
  }

  return next;
}

export function buildReliableFormPayload(form: OfferFormInput): OfferFormInput {
  const seeded: OfferFormInput = {
    ...form,
    category: form.category || "Physical Product",
    price: safeText(form.price) || "29",
    description: safeText(form.description),
    targetAudience: safeText(form.targetAudience),
    painPoint: safeText(form.painPoint),
    benefits: [
      safeText(form.benefits?.[0]),
      safeText(form.benefits?.[1]),
      safeText(form.benefits?.[2]),
    ],
    socialProof: safeText(form.socialProof),
    primaryCta: form.primaryCta || "Buy Now",
    brandTone: form.brandTone || "Professional",
    platforms: form.platforms.length > 0 ? form.platforms : inferPlatforms(form.category || "Physical Product"),
  };

  if (!seeded.offerName && !seeded.description) {
    seeded.description = DEFAULT_DESCRIPTION;
  }

  return autoFillForm(seeded);
}

export function normalizeReliableOfferInput(input: OfferFormInput): OfferFormData {
  const safe = buildReliableFormPayload(input);

  return {
    sourceUrl: safe.sourceUrl,
    inputType: safe.inputType || "manual",
    offerName: safe.offerName || "Untitled Offer",
    category: safe.category,
    price: Number(safe.price || 29),
    description: safe.description || DEFAULT_DESCRIPTION,
    targetAudience: safe.targetAudience || DEFAULT_AUDIENCE,
    painPoint: safe.painPoint || DEFAULT_PAIN,
    benefits: safe.benefits.some(Boolean) ? safe.benefits : DEFAULT_BENEFITS,
    socialProof: safe.socialProof,
    primaryCta: safe.primaryCta || inferCTA(safe),
    brandTone: safe.brandTone || "Professional",
    platforms: safe.platforms.length > 0 ? safe.platforms : inferPlatforms(safe.category),
  };
}
