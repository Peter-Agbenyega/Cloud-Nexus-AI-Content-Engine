import OpenAI from "openai";

import { PLATFORM_CONFIG, STRATEGY_SYSTEM_PROMPT } from "@/lib/constants";
import { parseJsonResponse } from "@/lib/json";
import {
  AssistDraft,
  AssistRequestBody,
  AssistResponseBody,
  BrandTone,
  GenerateResponseBody,
  GenerateRequestBody,
  GeneratedContent,
  GenerationIssue,
  OfferCategory,
  OfferFormData,
  PlatformKey,
  ProductIdea,
  ProductIdeasResponseBody,
  PrimaryCta,
  StrategyBrief,
  StrategyRequestBody,
} from "@/lib/types";

const MODEL_NAME = "gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.7;
const REQUEST_TIMEOUT_MS = 60_000;

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Generation timed out. Please try again."));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function formatOfferDetails(offerData: OfferFormData) {
  return `OFFER: ${offerData.offerName}
CATEGORY: ${offerData.category}
PRICE: ${offerData.price}
DESCRIPTION: ${offerData.description}
TARGET AUDIENCE: ${offerData.targetAudience}
CORE PAIN POINT: ${offerData.painPoint}
TOP BENEFITS: ${offerData.benefits.join(" | ")}
SOCIAL PROOF: ${offerData.socialProof || "None provided"}
PRIMARY CTA: ${offerData.primaryCta}
BRAND TONE: ${offerData.brandTone}
PLATFORMS: ${offerData.platforms.join(", ")}`;
}

function formatAssistInput(offerData: Partial<AssistRequestBody["offerData"]>, idea?: string) {
  return `IDEA: ${idea || "Not provided"}
OFFER NAME: ${offerData.offerName || "Not provided"}
CATEGORY: ${offerData.category || "Not provided"}
PRICE: ${offerData.price || "Not provided"}
DESCRIPTION: ${offerData.description || "Not provided"}
TARGET AUDIENCE: ${offerData.targetAudience || "Not provided"}
PAIN POINT: ${offerData.painPoint || "Not provided"}
BENEFITS: ${Array.isArray(offerData.benefits) ? offerData.benefits.join(" | ") : "Not provided"}
SOCIAL PROOF: ${offerData.socialProof || "Not provided"}
PRIMARY CTA: ${offerData.primaryCta || "Not provided"}
BRAND TONE: ${offerData.brandTone || "Not provided"}
PLATFORMS: ${Array.isArray(offerData.platforms) ? offerData.platforms.join(", ") : "Not provided"}`;
}

function compactString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function compactStringArray(value: unknown, minimum = 0, fallbackPrefix = "Item"): string[] {
  const raw = Array.isArray(value) ? value : [];
  const items = raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length >= minimum) return items;

  const next = [...items];
  while (next.length < minimum) {
    next.push(`${fallbackPrefix} ${next.length + 1}`);
  }
  return next;
}

function sanitizeStrategyBrief(value: unknown): StrategyBrief {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const topAnglesRaw = Array.isArray(raw.topAngles) ? raw.topAngles : [];
  const topAngles = topAnglesRaw
    .map((angle, index) => {
      const current = angle && typeof angle === "object" ? angle as Record<string, unknown> : {};
      return {
        angle: compactString(current.angle, `Angle ${index + 1}`),
        rationale: compactString(current.rationale, "Supports the offer with a clear buying reason."),
        bestFor: compactString(current.bestFor, "Cold traffic and first-touch campaigns"),
      };
    })
    .slice(0, 3);

  while (topAngles.length < 3) {
    topAngles.push({
      angle: `Angle ${topAngles.length + 1}`,
      rationale: "Supports the offer with a clear buying reason.",
      bestFor: "Cold traffic and first-touch campaigns",
    });
  }

  const objections = compactStringArray(raw.topObjections, 3, "Objection").slice(0, 3) as [string, string, string];
  const bestChannels = compactStringArray(raw.bestChannels, 1, "Channel");
  const awareness = raw.audienceAwarenessLevel;

  return {
    positioningSummary: compactString(raw.positioningSummary, "A clear offer for a well-defined buyer."),
    topAngles: topAngles as StrategyBrief["topAngles"],
    primaryEmotionalHook: compactString(raw.primaryEmotionalHook, "Show the buyer how this offer removes friction quickly."),
    topObjections: objections,
    recommendedCTA: compactString(raw.recommendedCTA, "Learn More"),
    bestChannels,
    audienceAwarenessLevel:
      awareness === "problem-aware" || awareness === "solution-aware" || awareness === "product-aware"
        ? awareness
        : "problem-aware",
    contentPriority: compactString(raw.contentPriority, "Start with the fastest conversion asset, then expand to supporting channels."),
  };
}

function sanitizePlatformContent(platform: PlatformKey, value: unknown): GeneratedContent[PlatformKey] {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;

  if (platform === "tiktok-reels") {
    const hooksRaw = Array.isArray(raw.hooks) ? raw.hooks : [];
    const hooks = hooksRaw
      .map((hook, index) => {
        const current = hook && typeof hook === "object" ? hook as Record<string, unknown> : {};
        return {
          hook: compactString(current.hook, `Hook ${index + 1}`),
          type: compactString(current.type, "Direct"),
        };
      })
      .slice(0, 3);
    while (hooks.length < 3) {
      hooks.push({ hook: `Hook ${hooks.length + 1}`, type: "Direct" });
    }

    const script = raw.script && typeof raw.script === "object" ? raw.script as Record<string, unknown> : {};

    return {
      hooks,
      script: {
        hook: compactString(script.hook, hooks[0]?.hook ?? "Hook"),
        problem: compactString(script.problem, "Call out the buyer's current frustration."),
        solution: compactString(script.solution, "Introduce the offer as the practical fix."),
        proof: compactString(script.proof, "Use a concrete proof point or customer outcome."),
        cta: compactString(script.cta, "Tell viewers what to do next."),
        onScreenText: compactStringArray(script.onScreenText, 0, "On-screen text"),
        totalDuration: compactString(script.totalDuration, "20-30 seconds"),
      },
      captionVariants: compactStringArray(raw.captionVariants, 3, "Caption").slice(0, 3),
    };
  }

  if (platform === "facebook-meta-ads") {
    const variantsRaw = Array.isArray(raw.variants) ? raw.variants : [];
    const variants = variantsRaw
      .map((variant, index) => {
        const current = variant && typeof variant === "object" ? variant as Record<string, unknown> : {};
        const primaryText = current.primaryText && typeof current.primaryText === "object"
          ? current.primaryText as Record<string, unknown>
          : {};
        return {
          headline: compactString(current.headline, `Ad headline ${index + 1}`),
          primaryText: {
            short: compactString(primaryText.short, "Short ad copy."),
            medium: compactString(primaryText.medium, "Medium-length ad copy."),
            long: compactString(primaryText.long, "Long-form ad copy."),
          },
          description: compactString(current.description, "Short description."),
          ctaButton: compactString(current.ctaButton, "Learn More"),
        };
      })
      .slice(0, 3);

    if (!variants.length) {
      throw new Error("No usable ad variants were returned.");
    }

    return { variants };
  }

  if (platform === "product-page-copy") {
    const faqItemsRaw = Array.isArray(raw.faqItems) ? raw.faqItems : [];
    const faqItems = faqItemsRaw
      .map((item, index) => {
        const current = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          question: compactString(current.question, `FAQ ${index + 1}`),
          answer: compactString(current.answer, "Answer this objection clearly."),
        };
      })
      .slice(0, 3);
    while (faqItems.length < 3) {
      faqItems.push({
        question: `FAQ ${faqItems.length + 1}`,
        answer: "Answer this objection clearly.",
      });
    }

    return {
      heroHeadline: compactString(raw.heroHeadline, "A stronger headline is needed."),
      heroSubheadline: compactString(raw.heroSubheadline, "Support the headline with a clear promise."),
      benefitBullets: compactStringArray(raw.benefitBullets, 5, "Benefit").slice(0, 5),
      socialProofPlacement: compactString(raw.socialProofPlacement, "Place proof close to the offer section."),
      faqItems,
    };
  }

  if (platform === "email-promo") {
    const subjectLinesRaw = Array.isArray(raw.subjectLines) ? raw.subjectLines : [];
    const subjectLines = subjectLinesRaw
      .map((line, index) => {
        const current = line && typeof line === "object" ? line as Record<string, unknown> : {};
        return {
          subject: compactString(current.subject, `Subject line ${index + 1}`),
          previewText: compactString(current.previewText, "Preview text."),
        };
      })
      .slice(0, 3);
    while (subjectLines.length < 3) {
      subjectLines.push({
        subject: `Subject line ${subjectLines.length + 1}`,
        previewText: "Preview text.",
      });
    }

    const body = raw.body && typeof raw.body === "object" ? raw.body as Record<string, unknown> : {};

    return {
      subjectLines,
      body: {
        opening: compactString(body.opening, "Open with the buyer's current situation."),
        problem: compactString(body.problem, "State the core problem."),
        solution: compactString(body.solution, "Explain how the offer helps."),
        offer: compactString(body.offer, "Present the offer clearly."),
        cta: compactString(body.cta, "Invite the click."),
        ps: compactString(body.ps, "Use a short closing reminder."),
      },
    };
  }

  const aboveFold = raw.aboveFold && typeof raw.aboveFold === "object" ? raw.aboveFold as Record<string, unknown> : {};
  const problemSection = raw.problemSection && typeof raw.problemSection === "object" ? raw.problemSection as Record<string, unknown> : {};
  const solutionSection = raw.solutionSection && typeof raw.solutionSection === "object" ? raw.solutionSection as Record<string, unknown> : {};
  const proofSection = raw.proofSection && typeof raw.proofSection === "object" ? raw.proofSection as Record<string, unknown> : {};
  const offerStack = raw.offerStack && typeof raw.offerStack === "object" ? raw.offerStack as Record<string, unknown> : {};
  const finalCta = raw.finalCta && typeof raw.finalCta === "object" ? raw.finalCta as Record<string, unknown> : {};

  return {
    aboveFold: {
      headline: compactString(aboveFold.headline, "A sharper headline is needed."),
      subheadline: compactString(aboveFold.subheadline, "Support the promise with a clear subheadline."),
      cta: compactString(aboveFold.cta, "Learn More"),
    },
    problemSection: {
      headline: compactString(problemSection.headline, "Problem"),
      body: compactString(problemSection.body, "Describe the core customer frustration."),
    },
    solutionSection: {
      headline: compactString(solutionSection.headline, "Solution"),
      body: compactString(solutionSection.body, "Explain how the offer solves the problem."),
    },
    proofSection: {
      headline: compactString(proofSection.headline, "Proof"),
      points: compactStringArray(proofSection.points, 3, "Proof point").slice(0, 3),
    },
    offerStack: {
      headline: compactString(offerStack.headline, "What they get"),
      items: compactStringArray(offerStack.items, 3, "Offer item").slice(0, 3),
    },
    finalCta: {
      headline: compactString(finalCta.headline, "Ready to take the next step?"),
      button: compactString(finalCta.button, "Get Started"),
      urgency: compactString(finalCta.urgency, "Give them a simple reason to act now."),
    },
  };
}

function sanitizeAssistDraft(value: unknown, mode: AssistRequestBody["mode"]): AssistDraft {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const category = raw.category;
  const brandTone = raw.brandTone;
  const primaryCta = raw.primaryCta;
  const platforms = Array.isArray(raw.platforms)
    ? raw.platforms.filter((item): item is PlatformKey => typeof item === "string")
    : [];

  const next: AssistDraft = {
    offerName: compactString(raw.offerName, ""),
    category: (
      category === "Physical Product" ||
      category === "Digital Product" ||
      category === "Service" ||
      category === "SaaS" ||
      category === "Course"
        ? category
        : undefined
    ) as OfferCategory | undefined,
    price: compactString(raw.price, ""),
    description: compactString(raw.description, ""),
    targetAudience: compactString(raw.targetAudience, ""),
    painPoint: compactString(raw.painPoint, ""),
    benefits: compactStringArray(raw.benefits, 3, "Benefit").slice(0, 3) as [string, string, string],
    socialProof: compactString(raw.socialProof, ""),
    primaryCta: (
      primaryCta === "Buy Now" ||
      primaryCta === "Book a Call" ||
      primaryCta === "Download" ||
      primaryCta === "Sign Up" ||
      primaryCta === "Learn More"
        ? primaryCta
        : undefined
    ) as PrimaryCta | undefined,
    brandTone: (
      brandTone === "Professional" ||
      brandTone === "Casual" ||
      brandTone === "Bold" ||
      brandTone === "Empathetic" ||
      brandTone === "Urgent" ||
      brandTone === "Playful"
        ? brandTone
        : undefined
    ) as BrandTone | undefined,
    platforms: platforms.length > 0 ? platforms : undefined,
  };

  if (mode === "draft") {
    return {
      description: next.description,
      targetAudience: next.targetAudience,
      painPoint: next.painPoint,
      benefits: next.benefits,
      primaryCta: next.primaryCta,
    };
  }

  return next;
}

function sanitizeProductIdeas(value: unknown): ProductIdea[] {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { ideas?: unknown[] }).ideas)
      ? (value as { ideas: unknown[] }).ideas
      : [];

  const ideas = raw
    .map((item, index) => {
      const current = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const category = current.category;
      const primaryCta = current.primaryCta;
      const brandTone = current.brandTone;
      const platforms = Array.isArray(current.platforms)
        ? current.platforms.filter((entry): entry is PlatformKey => typeof entry === "string")
        : [];

      return {
        id: compactString(current.id, `idea-${index + 1}`),
        productName: compactString(current.productName, `Product Idea ${index + 1}`),
        category: (
          category === "Physical Product" ||
          category === "Digital Product" ||
          category === "Service" ||
          category === "SaaS" ||
          category === "Course"
            ? category
            : "Physical Product"
        ) as OfferCategory,
        targetAudience: compactString(current.targetAudience, "Online buyers looking for a practical result."),
        hookIdea: compactString(current.hookIdea, "Lead with a simple before-and-after promise."),
        estimatedPrice: compactString(current.estimatedPrice, "$29"),
        description: compactString(current.description, "A practical offer built for straightforward ecommerce demand."),
        painPoint: compactString(current.painPoint, "Buyers want a simpler option that feels easier to trust."),
        benefits: compactStringArray(current.benefits, 3, "Benefit").slice(0, 3) as [string, string, string],
        socialProof: compactString(current.socialProof, "Early customers mention the offer feels practical and easy to understand."),
        primaryCta: (
          primaryCta === "Buy Now" ||
          primaryCta === "Book a Call" ||
          primaryCta === "Download" ||
          primaryCta === "Sign Up" ||
          primaryCta === "Learn More"
            ? primaryCta
            : "Buy Now"
        ) as PrimaryCta,
        brandTone: (
          brandTone === "Professional" ||
          brandTone === "Casual" ||
          brandTone === "Bold" ||
          brandTone === "Empathetic" ||
          brandTone === "Urgent" ||
          brandTone === "Playful"
            ? brandTone
            : "Professional"
        ) as BrandTone,
        platforms: (
          platforms.length > 0
            ? platforms
            : ["tiktok-reels", "facebook-meta-ads", "product-page-copy"]
        ) as ProductIdea["platforms"],
      };
    })
    .filter((idea) => idea.productName.trim());

  return ideas.slice(0, 10);
}

function buildFallbackIdeas(category?: OfferCategory | null): ProductIdea[] {
  const baseIdeas: ProductIdea[] = [
    {
      id: "recovery-gummies",
      productName: "Sleep + Recovery Gummies",
      category: "Physical Product",
      targetAudience: "Busy professionals and parents who want better sleep without a heavy nightly routine",
      hookIdea: "A calm-evening ritual that feels simple enough to keep using",
      estimatedPrice: "$24",
      description: "A low-friction sleep support product designed for people who want a practical wind-down ritual.",
      painPoint: "They are tired at night but still wired, and most sleep products feel too intense or inconsistent.",
      benefits: [
        "Feels easy to add to an existing evening routine",
        "Supports a calmer wind-down without complicated steps",
        "Creates a more giftable, premium wellness option",
      ],
      socialProof: "Early buyers mention they actually keep this habit because it feels simple.",
      primaryCta: "Buy Now",
      brandTone: "Empathetic",
      platforms: ["tiktok-reels", "facebook-meta-ads", "product-page-copy", "email-promo"],
    },
    {
      id: "desk-reset-kit",
      productName: "Desk Reset Focus Kit",
      category: "Physical Product",
      targetAudience: "Remote workers who want their desk to feel cleaner, calmer, and easier to work from",
      hookIdea: "Turn a cluttered desk into a setup that helps work start faster",
      estimatedPrice: "$39",
      description: "A bundled desk-accessory kit positioned as a small environment upgrade with immediate payoff.",
      painPoint: "Their workspace feels messy and distracting, but most productivity products feel over-engineered.",
      benefits: [
        "Creates a cleaner work setup fast",
        "Feels giftable and easy to understand at a glance",
        "Bundles several small wins into one purchase",
      ],
      socialProof: "Customers share before-and-after desk photos and repeat-buy for gifts.",
      primaryCta: "Buy Now",
      brandTone: "Professional",
      platforms: ["tiktok-reels", "facebook-meta-ads", "product-page-copy"],
    },
    {
      id: "creator-caption-pack",
      productName: "Creator Caption Prompt Pack",
      category: "Digital Product",
      targetAudience: "Small creators and solo sellers who need faster content prompts for product marketing",
      hookIdea: "Skip the blank page and start with proven caption angles",
      estimatedPrice: "$19",
      description: "A digital prompt pack that helps creators write social captions and promo hooks faster.",
      painPoint: "They know they should post more often, but writing fresh promo content keeps slowing them down.",
      benefits: [
        "Cuts the time needed to plan content",
        "Makes product promotion feel less repetitive",
        "Low-ticket pricing is easy to test with cold traffic",
      ],
      socialProof: "Used by creators who want a repeatable content starting point.",
      primaryCta: "Download",
      brandTone: "Casual",
      platforms: ["tiktok-reels", "facebook-meta-ads", "email-promo", "landing-page"],
    },
    {
      id: "shop-audit",
      productName: "48-Hour Shopify Conversion Audit",
      category: "Service",
      targetAudience: "Lean ecommerce founders who know their store has friction but need sharp outside diagnosis",
      hookIdea: "Find the conversion leaks before spending more on traffic",
      estimatedPrice: "$149",
      description: "A productized audit service with fast turnaround and a narrow, outcome-focused deliverable.",
      painPoint: "They are spending on traffic or content, but they do not know what on-site friction is actually killing sales.",
      benefits: [
        "Clear fixed-scope service is easier to buy",
        "Fast turnaround lowers hesitation",
        "Works well as an entry offer into higher-value services",
      ],
      socialProof: "Founders can share simple before-and-after conversion fixes from the audit.",
      primaryCta: "Book a Call",
      brandTone: "Professional",
      platforms: ["facebook-meta-ads", "landing-page", "email-promo"],
    },
    {
      id: "returns-copilot",
      productName: "Returns Copilot for Shopify Brands",
      category: "SaaS",
      targetAudience: "Small ecommerce teams handling too many repetitive support and returns requests",
      hookIdea: "Reduce repeat tickets without hiring another support rep",
      estimatedPrice: "$29",
      description: "A SaaS tool framed around reducing return-related support load for ecommerce teams.",
      painPoint: "Returns and repetitive policy questions consume support time and frustrate buyers after purchase.",
      benefits: [
        "Easy monthly price lowers buyer resistance",
        "Solves a narrow, understandable ecommerce problem",
        "Strong fit for demo-driven landing pages and ads",
      ],
      socialProof: "Operators understand the value quickly because the cost of repetitive tickets is obvious.",
      primaryCta: "Sign Up",
      brandTone: "Bold",
      platforms: ["facebook-meta-ads", "landing-page", "email-promo", "product-page-copy"],
    },
    {
      id: "micro-course",
      productName: "Short-Form Product Ads Bootcamp",
      category: "Course",
      targetAudience: "Founders and marketers who need to make simple product videos without hiring a full creative team",
      hookIdea: "Learn the exact ad structure that gets product videos made faster",
      estimatedPrice: "$99",
      description: "A focused course teaching operators how to make product ads with simpler creative workflows.",
      painPoint: "They want short-form ads to work, but every new video feels like starting from zero.",
      benefits: [
        "Clear transformation is easy to explain",
        "Price point fits self-serve education buyers",
        "Supports upsells into templates, coaching, or community",
      ],
      socialProof: "Student outcomes can be shown with ad examples and first-video wins.",
      primaryCta: "Download",
      brandTone: "Professional",
      platforms: ["tiktok-reels", "facebook-meta-ads", "landing-page", "email-promo"],
    },
    {
      id: "hydration-bottle",
      productName: "Hydration Tracking Bottle",
      category: "Physical Product",
      targetAudience: "Health-conscious shoppers who want a visible daily habit cue rather than another complex app",
      hookIdea: "A daily wellness product that makes hydration easier to stick to",
      estimatedPrice: "$28",
      description: "A practical wellness bottle positioned around everyday consistency and visible progress.",
      painPoint: "They want healthier routines, but most habit products require too much maintenance or attention.",
      benefits: [
        "Simple benefit is instantly legible in ads",
        "Giftable and impulse-friendly price point",
        "Works well in visual ecommerce creative",
      ],
      socialProof: "Habit-driven products encourage repeat use photos and user-generated content.",
      primaryCta: "Buy Now",
      brandTone: "Empathetic",
      platforms: ["tiktok-reels", "facebook-meta-ads", "product-page-copy"],
    },
    {
      id: "template-bundle",
      productName: "Mini Brand Kit Template Bundle",
      category: "Digital Product",
      targetAudience: "New ecommerce sellers who need brand consistency without hiring a designer",
      hookIdea: "Look more established in a weekend without starting from scratch",
      estimatedPrice: "$29",
      description: "A low-ticket digital bundle that helps small sellers launch a cleaner visual brand faster.",
      painPoint: "Their store and social pages look inconsistent, which makes the business feel less trustworthy.",
      benefits: [
        "Fast setup creates immediate value",
        "Low-ticket pricing is easy to test",
        "Naturally expands into bundles and upsells",
      ],
      socialProof: "Before-and-after examples make the outcome concrete and easy to market.",
      primaryCta: "Download",
      brandTone: "Playful",
      platforms: ["tiktok-reels", "facebook-meta-ads", "landing-page", "email-promo"],
    },
  ];

  const filtered = category ? baseIdeas.filter((idea) => idea.category === category) : baseIdeas;
  return filtered.slice(0, Math.min(Math.max(filtered.length, 5), 8));
}

export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2000,
  temperature = DEFAULT_TEMPERATURE,
): Promise<string> {
  try {
    const response = await withTimeout(
      getOpenAIClient().chat.completions.create({
        model: MODEL_NAME,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      REQUEST_TIMEOUT_MS,
    );

    const text = response.choices[0]?.message?.content?.trim();

    if (!text) {
      throw new Error("Empty response from OpenAI.");
    }

    return text;
  } catch (error) {
    console.error("OpenAI chat completion failed.", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("AI generation failed. Please try again.");
  }
}

export async function streamOpenAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2000,
): Promise<ReadableStream<Uint8Array>> {
  const stream = await getOpenAIClient().chat.completions.create({
    model: MODEL_NAME,
    temperature: DEFAULT_TEMPERATURE,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

async function requestStructuredJson<T>(
  system: string,
  prompt: string,
  maxTokens: number,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const finalPrompt =
        attempt === 0
          ? prompt
          : `${prompt}\n\nYour previous response was invalid JSON. Return only a valid JSON object that matches the requested schema exactly.`;

      const rawText = await createChatCompletion({
        system,
        finalPrompt,
        maxTokens,
      });

      return parseJsonResponse<T>(rawText);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown AI error.");
      console.error(`OpenAI structured JSON attempt ${attempt + 1} failed.`, lastError);
    }
  }

  throw lastError ?? new Error("Unable to parse AI response.");
}

async function createChatCompletion({
  system,
  finalPrompt,
  maxTokens,
  temperature = DEFAULT_TEMPERATURE,
}: {
  system: string;
  finalPrompt: string;
  maxTokens: number;
  temperature?: number;
}) {
  return callOpenAI(system, finalPrompt, maxTokens, temperature);
}

export async function generateStrategyBrief(
  body: StrategyRequestBody,
): Promise<StrategyBrief> {
  const raw = await requestStructuredJson<unknown>(STRATEGY_SYSTEM_PROMPT, buildStrategyPrompt(body.offerData), 900);
  return sanitizeStrategyBrief(raw);
}

export function buildStrategyPrompt(offerData: OfferFormData) {
  return `Analyze this offer and produce a strategic brief:

${formatOfferDetails(offerData)}

Return a JSON object with this exact structure:
{
  positioningSummary: string (2-3 sentences),
  topAngles: [
    { angle: string, rationale: string, bestFor: string }
  ] (exactly 3),
  primaryEmotionalHook: string,
  topObjections: [string] (exactly 3),
  recommendedCTA: string,
  bestChannels: [string],
  audienceAwarenessLevel: 'problem-aware' | 'solution-aware' | 'product-aware',
  contentPriority: string (what to create first and why)
}

Return only valid JSON. No markdown. No explanation.`;
}

async function generatePlatformContent(
  platform: PlatformKey,
  offerData: OfferFormData,
  strategyBrief: StrategyBrief,
) {
  const config = PLATFORM_CONFIG[platform];

  const prompt = `Using the strategic brief below, generate ${config.name} content for this offer.

STRATEGIC BRIEF:
${JSON.stringify(strategyBrief, null, 2)}

ORIGINAL OFFER DETAILS:
${formatOfferDetails(offerData)}

Generate ${config.instructions}

Return valid JSON matching this structure:
${config.schema}

Return only valid JSON. No markdown. No explanation.`;

  const raw = await requestStructuredJson<unknown>(config.systemPrompt, prompt, 1400);
  return sanitizePlatformContent(platform, raw);
}

export async function generatePlatformPack(body: GenerateRequestBody): Promise<GenerateResponseBody> {
  const settled = await Promise.allSettled(
    body.platforms.map(async (platform) => {
      const result = await generatePlatformContent(
        platform,
        body.offerData,
        body.strategyBrief,
      );

      return [platform, result] as const;
    }),
  );

  const generatedContent: GeneratedContent = {};
  const failedPlatforms: GenerationIssue[] = [];

  settled.forEach((result, index) => {
    const platform = body.platforms[index];

    if (result.status === "fulfilled") {
      const [key, value] = result.value;
      (generatedContent as Record<PlatformKey, unknown>)[key] = value;
      return;
    }

    const message = result.reason instanceof Error
      ? result.reason.message
      : "This section could not be generated this time.";

    console.error(`Platform generation failed for ${platform}.`, result.reason);
    failedPlatforms.push({
      platform,
      message,
    });
  });

  if (Object.keys(generatedContent).length === 0) {
    throw new Error("Content generation failed for every selected platform. Please try again.");
  }

  return {
    generatedContent,
    failedPlatforms,
  };
}

export async function generateAssistDraft(body: AssistRequestBody): Promise<AssistResponseBody> {
  const prompt = body.mode === "full"
    ? `Turn this rough campaign idea into a complete first-pass offer intake draft.

${formatAssistInput(body.offerData, body.idea)}

Return a JSON object with this exact structure:
{
  offerName: string,
  category: "Physical Product" | "Digital Product" | "Service" | "SaaS" | "Course",
  price: string,
  description: string,
  targetAudience: string,
  painPoint: string,
  benefits: [string, string, string],
  socialProof: string,
  primaryCta: "Buy Now" | "Book a Call" | "Download" | "Sign Up" | "Learn More",
  brandTone: "Professional" | "Casual" | "Bold" | "Empathetic" | "Urgent" | "Playful",
  platforms: ["tiktok-reels", "facebook-meta-ads", "product-page-copy", "email-promo", "landing-page"]
}

Keep it concise, practical, and commerce-focused. Match the copy to the category: physical products should feel tangible and purchase-ready, SaaS should emphasize workflow clarity and adoption, services should emphasize trust and done-for-you execution, and digital products/courses should emphasize usable structure and speed to outcome. Keep the language aligned with the submitted brand tone in word choice, confidence level, and pacing. Return only valid JSON.`
    : `Fill missing offer intake details based on what is already known.

${formatAssistInput(body.offerData, body.idea)}

Return a JSON object with this exact structure:
{
  description: string,
  targetAudience: string,
  painPoint: string,
  benefits: [string, string, string],
  primaryCta: "Buy Now" | "Book a Call" | "Download" | "Sign Up" | "Learn More"
}

Keep outputs short, specific, editable, and aligned to the offer category and brand tone. Adjust word choice and intensity to fit the brand tone instead of defaulting to neutral copy. Return only valid JSON.`;

  const raw = await requestStructuredJson<unknown>(
    "You are a commerce-focused assistant that turns rough offer ideas into clear, usable campaign intake drafts. Prefer category-specific, editable phrasing over hype, and keep tone signals consistent with the selected brand voice.",
    prompt,
    body.mode === "full" ? 900 : 500,
  );

  return {
    suggestion: sanitizeAssistDraft(raw, body.mode),
    source: "ai",
  };
}

export async function generateProductIdeas(category?: OfferCategory | null): Promise<ProductIdeasResponseBody> {
  const prompt = `Generate 8 ecommerce-friendly product ideas${category ? ` for the "${category}" category` : ""}.

Rank ideas using these filters:
- clear demand signals and practical trend alignment
- price simplicity for a first purchase
- strong ecommerce viability
- simple messaging and ad creative potential

Return a JSON object with this exact structure:
{
  ideas: [
    {
      id: string,
      productName: string,
      category: "Physical Product" | "Digital Product" | "Service" | "SaaS" | "Course",
      targetAudience: string,
      hookIdea: string,
      estimatedPrice: string,
      description: string,
      painPoint: string,
      benefits: [string, string, string],
      socialProof: string,
      primaryCta: "Buy Now" | "Book a Call" | "Download" | "Sign Up" | "Learn More",
      brandTone: "Professional" | "Casual" | "Bold" | "Empathetic" | "Urgent" | "Playful",
      platforms: ["tiktok-reels", "facebook-meta-ads", "product-page-copy", "email-promo", "landing-page"]
    }
  ]
}

Keep every idea concise, commercially plausible, and easy to explain in one sentence. Return only valid JSON.`;

  try {
    const raw = await requestStructuredJson<unknown>(
      "You are a product idea strategist for ecommerce operators. Prefer ideas that are straightforward to price, easy to explain, and realistically marketable online.",
      prompt,
      1300,
    );

    const ideas = sanitizeProductIdeas(raw);
    if (ideas.length >= 5) {
      return { ideas, source: "ai" };
    }
  } catch (error) {
    console.error("Product ideas generation fell back to heuristics.", error);
  }

  return {
    ideas: buildFallbackIdeas(category),
    source: "heuristic",
  };
}

export default getOpenAIClient;
