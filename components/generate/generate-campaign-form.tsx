"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, LayoutPanelTop, Mail, ShoppingBag, Sparkles, Target, Video, WandSparkles } from "lucide-react";

import { autoFillForm, buildReliableFormPayload, inferCTA, inferPlatforms } from "@/lib/autoFill";
import { INITIAL_FORM_STATE, PLATFORM_LABELS } from "@/lib/constants";
import { normalizeOfferInput, validateStep } from "@/lib/form";
import { ConversationAssist } from "@/components/generate/conversation-assist";
import {
  AssistDraft,
  AssistResponseBody,
  brandToneOptions,
  categoryOptions,
  GenerateResponseBody,
  GenerationIssue,
  OfferFormInput,
  PlatformKey,
  platformOptions,
  primaryCtaOptions,
  ProductIdea,
  SaveCampaignRequestBody,
  StrategyBrief,
} from "@/lib/types";
import { calculateCommerceScores } from "@/lib/commerce-score";

const IDEA_STORAGE_KEY = "cloud-nexus:selected-product-idea";
const LOADING_MESSAGES = [
  "Analysing offer...",
  "Building strategy...",
  "Generating content...",
];

const STREAM_STAGES = [
  { threshold: 20, label: "Analyzing your offer..." },
  { threshold: 50, label: "Identifying your audience..." },
  { threshold: 80, label: "Building campaign angles..." },
  { threshold: 100, label: "Finalizing strategy..." },
] as const;

const STEP_META = [
  {
    heading: "Tell us about your offer",
    sub: "We'll use this to build your strategy brief.",
    required: "Required now: offer name, category, price point, and a short description.",
  },
  {
    heading: "Describe your ideal buyer",
    sub: "The more specific you are, the better the output.",
    required: "Required now: target audience, pain point, and three buyer-facing benefits.",
  },
  {
    heading: "Set up your campaign",
    sub: "Choose where you want to publish this content.",
    required: "Required now: choose a CTA, brand tone, and at least one platform.",
  },
  {
    heading: "Ready to generate",
    sub: "Review your offer brief before we start.",
    required: "Give it one final scan, then generate your campaign pack.",
  },
] as const;

const STEP_LABELS = ["Offer", "Audience", "Settings", "Review"];

type FormFieldKey =
  | "offerName"
  | "category"
  | "price"
  | "description"
  | "targetAudience"
  | "painPoint"
  | "benefit-0"
  | "benefit-1"
  | "benefit-2"
  | "socialProof"
  | "primaryCta"
  | "brandTone"
  | "platforms";

type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }

interface UrlExtractResponse {
  extracted: {
    sourceUrl: string;
    offerName: string;
    description: string;
    price: string;
    benefits: string[];
    targetAudience: string;
    painPoint: string;
    socialProof: string;
    category: OfferFormInput["category"];
  } | null;
  error?: string;
}

interface BrandProfile {
  id: string;
  name: string;
  industry?: string | null;
  target_audience?: string | null;
  brand_voice?: string[] | null;
  preferred_cta?: string | null;
  color_notes?: string | null;
}

function platformIcon(platform: PlatformKey) {
  if (platform === "tiktok-reels") return Video;
  if (platform === "facebook-meta-ads") return Target;
  if (platform === "product-page-copy") return ShoppingBag;
  if (platform === "email-promo") return Mail;
  return LayoutPanelTop;
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

type CategoryProfile = {
  offerPlaceholder: string;
  descriptionHint: string;
  descriptionPlaceholder: string;
  audiencePlaceholder: string;
  audienceChips: string[];
  painPointPlaceholder: string;
  painPointChips: string[];
  benefitPlaceholder: string;
  benefitChips: string[];
  socialProofPlaceholder: string;
  socialProofChips: string[];
};

const CATEGORY_PROFILES: Record<OfferFormInput["category"], CategoryProfile> = {
  "Physical Product": {
    offerPlaceholder: "e.g. Bamboo Toothbrush 3-Pack",
    descriptionHint: "What physical outcome or buying advantage does this product deliver?",
    descriptionPlaceholder: "e.g. A plastic-free toothbrush set that lasts longer, looks premium, and makes daily routines feel less wasteful.",
    audiencePlaceholder: "e.g. Busy eco-conscious shoppers aged 28-45 who want practical swaps, not lifestyle lectures",
    audienceChips: ["Busy parents trying to reduce waste at home", "Health-focused shoppers replacing cheap daily essentials", "Gift buyers looking for something useful and premium"],
    painPointPlaceholder: "e.g. They keep buying cheap replacements that feel flimsy, create waste, and never feel worth the money.",
    painPointChips: ["Replacing low-quality basics too often", "Too much waste from everyday essentials", "Products look good online but disappoint in daily use"],
    benefitPlaceholder: "e.g. Feels sturdier and lasts longer than supermarket alternatives",
    benefitChips: ["Makes the product feel premium from day one", "Saves repeat purchases over time", "Turns an everyday routine into an easier win"],
    socialProofPlaceholder: "e.g. 4,200+ repeat customers · Featured in a sustainable gifting roundup",
    socialProofChips: ["4,000+ customer orders", "Top-rated by repeat buyers", "Featured in a trusted product roundup"],
  },
  "Digital Product": {
    offerPlaceholder: "e.g. Creator Pricing Templates Pack",
    descriptionHint: "What faster result or clearer outcome does this digital product create?",
    descriptionPlaceholder: "e.g. A ready-to-use template pack that helps creators price offers faster and stop second-guessing every launch.",
    audiencePlaceholder: "e.g. Solo creators selling their first digital products and tired of rebuilding everything from scratch",
    audienceChips: ["First-time creators launching a paid offer", "Freelancers packaging knowledge into digital products", "Small teams that need a reusable system fast"],
    painPointPlaceholder: "e.g. They waste hours stitching together advice, second-guess pricing, and delay launch decisions.",
    painPointChips: ["Too much advice and no clear template", "Launch tasks keep stalling because nothing feels ready", "Every new offer starts from a blank page"],
    benefitPlaceholder: "e.g. Gives them a proven starting point instead of another abstract framework",
    benefitChips: ["Cuts setup time dramatically", "Reduces decision fatigue", "Makes launch planning feel manageable"],
    socialProofPlaceholder: "e.g. Used by 1,200+ course creators and digital sellers",
    socialProofChips: ["Used by 1,000+ creators", "Recommended inside paid communities", "Built from proven launch workflows"],
  },
  Service: {
    offerPlaceholder: "e.g. Done-for-You Email Funnel Setup",
    descriptionHint: "What business outcome does the service create, and what friction does it remove?",
    descriptionPlaceholder: "e.g. A done-for-you setup service that turns scattered ideas into a live email funnel without the founder managing every detail.",
    audiencePlaceholder: "e.g. Founder-led businesses with sales coming in but no time to build reliable backend conversion systems",
    audienceChips: ["Founders juggling sales and delivery", "Small teams without an in-house specialist", "Operators who need execution, not more consulting"],
    painPointPlaceholder: "e.g. They know what needs fixing but the project keeps slipping because nobody owns it end-to-end.",
    painPointChips: ["Too much coordination for one founder", "Important growth work keeps slipping behind client delivery", "Hiring full-time is too heavy for the current stage"],
    benefitPlaceholder: "e.g. Gets a high-value conversion asset live without more internal project management",
    benefitChips: ["Removes the need to coordinate multiple freelancers", "Gets results faster than hiring in-house", "Creates a cleaner handoff and launch path"],
    socialProofPlaceholder: "e.g. Trusted by 35+ client brands in health, education, and B2B services",
    socialProofChips: ["Trusted by multiple client brands", "Repeat work from referrals", "Built from real client delivery experience"],
  },
  SaaS: {
    offerPlaceholder: "e.g. Support Inbox Copilot for Shopify Teams",
    descriptionHint: "What operational or revenue problem does the software solve?",
    descriptionPlaceholder: "e.g. A SaaS tool that helps support teams answer faster, reduce repeat tickets, and keep customer experience consistent.",
    audiencePlaceholder: "e.g. Lean ecommerce teams handling high ticket volume without enough headcount",
    audienceChips: ["Lean support teams with rising ticket volume", "Ops leads trying to protect response time", "Founders managing support manually after hours"],
    painPointPlaceholder: "e.g. The team is buried in repetitive tasks, response time slips, and customers feel the inconsistency.",
    painPointChips: ["Manual workflows are slowing the team down", "Important customer issues get buried in repetitive tasks", "Growth created complexity before processes caught up"],
    benefitPlaceholder: "e.g. Helps the team move faster without lowering response quality",
    benefitChips: ["Cuts repetitive manual work", "Improves team consistency", "Makes scale feel manageable without new hires"],
    socialProofPlaceholder: "e.g. Used by 180+ subscription brands with multi-agent support teams",
    socialProofChips: ["Adopted by growing subscription brands", "Improves response speed for lean teams", "Built around real support workflows"],
  },
  Course: {
    offerPlaceholder: "e.g. 6-Week Paid Ads Fundamentals Bootcamp",
    descriptionHint: "What transformation or confidence boost does the learner get?",
    descriptionPlaceholder: "e.g. A guided course that helps operators understand paid ads, launch with confidence, and stop wasting budget on guesswork.",
    audiencePlaceholder: "e.g. Small business owners who need paid ads to work but feel overwhelmed by the platforms",
    audienceChips: ["Operators learning growth marketing for the first time", "Freelancers expanding into paid acquisition", "Business owners tired of paying for vague advice"],
    painPointPlaceholder: "e.g. They have motivation, but the jargon and platform complexity make every step feel risky.",
    painPointChips: ["Too much theory and not enough practical guidance", "Fear of wasting money while learning", "Learning gets postponed because the setup feels intimidating"],
    benefitPlaceholder: "e.g. Gives them a practical learning path they can apply immediately",
    benefitChips: ["Turns complexity into a weekly action plan", "Builds confidence through structure", "Shortens the path from learning to execution"],
    socialProofPlaceholder: "e.g. Completed by 900+ students with strong referral and repeat enrollment",
    socialProofChips: ["Completed by hundreds of students", "Strong word-of-mouth referrals", "Built from real student questions and outcomes"],
  },
};

function benefitFieldKey(index: 0 | 1 | 2): FormFieldKey {
  return `benefit-${index}` as FormFieldKey;
}

function joinDescribedBy(...ids: Array<string | undefined>) {
  const value = ids.filter(Boolean).join(" ");
  return value || undefined;
}

function buildRequestErrorMessage(fallback: string, payload: unknown) {
  if (!payload || typeof payload !== "object") return fallback;

  const maybeError = (payload as { error?: unknown }).error;
  return typeof maybeError === "string" && maybeError.trim() ? maybeError : fallback;
}

function parseStreamedStrategy(value: string): StrategyBrief {
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned) as StrategyBrief;
}

async function fetchJsonWithTimeout<T>(url: string, init: RequestInit, timeoutMs = 90_000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = {};

    if (text.trim()) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        throw new Error("The server returned an unreadable response. Please try again.");
      }
    }

    if (!response.ok) {
      throw new Error(buildRequestErrorMessage("The request could not be completed.", payload));
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Generation took too long. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function fillFirstEmpty(items: [string, string, string], value: string) {
  const next = [...items] as [string, string, string];
  const targetIndex = next.findIndex((item) => !item.trim());

  if (targetIndex >= 0) {
    next[targetIndex] = value;
    return next;
  }

  next[2] = value;
  return next;
}

function replaceOrAppend(current: string, suggestion: string) {
  if (!current.trim()) return suggestion;
  if (current.includes(suggestion)) return current;
  return `${current.trim()} ${suggestion}`;
}

function renderMissingStepText(step: number, form: OfferFormInput) {
  const issues = validateStep(form, step);
  if (issues.length === 0) return "This step is ready.";
  return `Still needed: ${issues.join(" ")}`;
}

function inferCategoryFromText(text: string): OfferFormInput["category"] | null {
  const value = text.toLowerCase();

  if (value.includes("saas") || value.includes("software") || value.includes("app")) return "SaaS";
  if (value.includes("course") || value.includes("bootcamp") || value.includes("masterclass")) return "Course";
  if (value.includes("service") || value.includes("agency") || value.includes("consulting") || value.includes("done-for-you")) return "Service";
  if (value.includes("template") || value.includes("ebook") || value.includes("guide") || value.includes("digital")) return "Digital Product";
  return "Physical Product";
}

function inferToneFromText(text: string): OfferFormInput["brandTone"] {
  const value = text.toLowerCase();
  if (value.includes("urgent") || value.includes("fast")) return "Urgent";
  if (value.includes("fun") || value.includes("playful")) return "Playful";
  if (value.includes("bold") || value.includes("premium")) return "Bold";
  if (value.includes("friendly") || value.includes("easy")) return "Casual";
  if (value.includes("care") || value.includes("support")) return "Empathetic";
  return "Professional";
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanIdeaFragment(value: string) {
  return value
    .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
    .replace(/\b(an?|the)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIdeaSeed(seed: string) {
  const value = seed.trim();
  if (!value) {
    return { offer: "", audience: "" };
  }

  const parts = value.split(/\bfor\b/i);
  const offer = cleanIdeaFragment(parts[0] ?? value);
  const audience = cleanIdeaFragment(parts.slice(1).join(" for "));

  return { offer, audience };
}

function buildDescriptionSuggestion(offer: string, audience: string, profile: CategoryProfile) {
  if (!offer && !audience) return profile.descriptionPlaceholder;

  const offerText = offer || "This offer";
  const audienceText = audience || "buyers who want a simpler option";

  if (profile === CATEGORY_PROFILES["Physical Product"]) {
    return `${offerText} gives ${audienceText} a more useful, reliable upgrade they will notice in daily use.`;
  }

  if (profile === CATEGORY_PROFILES.SaaS) {
    return `${offerText} helps ${audienceText} replace a messy workflow with a clearer, more repeatable system.`;
  }

  if (profile === CATEGORY_PROFILES.Service) {
    return `${offerText} helps ${audienceText} get important work handled properly without more internal coordination.`;
  }

  if (profile === CATEGORY_PROFILES["Digital Product"]) {
    return `${offerText} helps ${audienceText} skip the blank-page phase and get to a usable result faster.`;
  }

  if (profile === CATEGORY_PROFILES.Course) {
    return `${offerText} helps ${audienceText} build confidence through a practical path they can apply step by step.`;
  }

  return `${offerText} helps ${audienceText} move from the current friction to a clearer, easier next step.`;
}

function inferPrice(category: OfferFormInput["category"], seed: string) {
  const value = seed.toLowerCase();

  if (category === "Service") return value.includes("audit") ? "150" : "250";
  if (category === "SaaS") return value.includes("team") ? "79" : "29";
  if (category === "Course") return "149";
  if (category === "Digital Product") return value.includes("bundle") || value.includes("pack") ? "49" : "29";
  return value.includes("set") || value.includes("bundle") || value.includes("kit") ? "39" : "24";
}

function buildAudienceSuggestion(seed: string, profile: CategoryProfile) {
  const parsed = parseIdeaSeed(seed);
  const text = `${seed.toLowerCase()} ${parsed.audience.toLowerCase()}`.trim();

  if (parsed.audience) {
    if (text.includes("eco")) return "Eco-conscious shoppers who want lower-waste daily essentials that still feel premium";
    if (text.includes("busy")) return "Busy buyers who want a simpler option that works reliably without extra effort";
    if (text.includes("founder") || text.includes("team")) return "Lean operators who need a practical solution without adding more complexity";
    if (text.includes("creator")) return "Creators who want a faster path from idea to launch without building everything from scratch";
    return `${toTitleCase(parsed.audience)} who want a more practical, easier-to-trust solution`;
  }

  if (text.includes("eco") || text.includes("sustain")) return "Eco-conscious shoppers who want practical low-waste upgrades without sacrificing quality";
  if (text.includes("busy") || text.includes("tired")) return "Busy buyers who want a reliable option that removes friction quickly";
  if (text.includes("founder") || text.includes("team")) return "Lean operators who need an easier system without adding more work";
  return profile.audienceChips[0];
}

function buildPainPointSuggestion(audience: string, profile: CategoryProfile) {
  if (!audience.trim()) return profile.painPointChips[0];

  if (profile === CATEGORY_PROFILES.SaaS) {
    return `${audience.trim()} are stuck with manual steps, scattered context, or slow handoffs that make the team less consistent.`;
  }

  if (profile === CATEGORY_PROFILES.Service) {
    return `${audience.trim()} know the work matters, but it keeps slipping because nobody has the time or specialist focus to own it.`;
  }

  if (profile === CATEGORY_PROFILES["Physical Product"]) {
    return `${audience.trim()} are tired of products that look promising online but feel flimsy, overhyped, or forgettable in daily use.`;
  }

  return `${audience.trim()} are tired of wasting time on awkward workarounds and want an option that feels easier to trust.`;
}

function buildBenefitSuggestions(seed: string, profile: CategoryProfile): [string, string, string] {
  const parsed = parseIdeaSeed(seed);
  const base = parsed.offer || seed.trim() || "This offer";

  if (profile === CATEGORY_PROFILES.SaaS) {
    return [
      `${base} makes the workflow easier to track and improve`,
      `${base} reduces repetitive work before it slows the team down`,
      `${base} helps the team stay consistent as volume grows`,
    ].map((item, index) => item.length > 90 ? profile.benefitChips[index] : item) as [string, string, string];
  }

  if (profile === CATEGORY_PROFILES.Service) {
    return [
      `${base} gives the buyer expert execution without extra coordination`,
      `${base} turns a stalled project into a clear deliverable`,
      `${base} creates momentum faster than hiring or managing from scratch`,
    ].map((item, index) => item.length > 90 ? profile.benefitChips[index] : item) as [string, string, string];
  }

  if (profile === CATEGORY_PROFILES["Physical Product"]) {
    return [
      `${base} feels useful and credible from the first use`,
      `${base} gives buyers a practical reason to choose it over a cheaper substitute`,
      `${base} makes the purchase feel worth repeating instead of instantly replaceable`,
    ].map((item, index) => item.length > 90 ? profile.benefitChips[index] : item) as [string, string, string];
  }

  return [
    `${base} gives the buyer a clearer result they can understand quickly`,
    `${base} reduces wasted time, second-guessing, or repeat effort`,
    `${base} makes the decision feel easier to trust and act on`,
  ].map((item, index) => item.length > 90 ? profile.benefitChips[index] : item) as [string, string, string];
}

function inferCtaFromBenefits(benefits: [string, string, string], category: OfferFormInput["category"]): OfferFormInput["primaryCta"] {
  const text = benefits.join(" ").toLowerCase();
  if (text.includes("call") || text.includes("team") || category === "Service") return "Book a Call";
  if (text.includes("trial") || text.includes("signup") || category === "SaaS") return "Sign Up";
  if (text.includes("download") || category === "Digital Product" || category === "Course") return "Download";
  if (text.includes("buy") || category === "Physical Product") return "Buy Now";
  return "Learn More";
}

function buildHeuristicSuggestion(form: OfferFormInput, profile: CategoryProfile, mode: "draft" | "full", idea?: string): AssistDraft {
  const seed = idea?.trim() || form.description.trim() || form.offerName.trim();
  const category = mode === "full" ? (inferCategoryFromText(seed || form.offerName) ?? form.category) : form.category;
  const parsed = parseIdeaSeed(seed || form.offerName);
  const offer = parsed.offer || form.offerName.trim();
  const audience = buildAudienceSuggestion(seed || form.targetAudience, profile);
  const painPoint = buildPainPointSuggestion(form.targetAudience.trim() || audience, profile);
  const benefits = buildBenefitSuggestions(seed || form.painPoint || form.offerName, profile);
  const cta = inferCtaFromBenefits(benefits, category);

  if (mode === "draft") {
    return {
      description: form.description.trim() || buildDescriptionSuggestion(offer, audience, profile),
      targetAudience: form.targetAudience.trim() || audience,
      painPoint: form.painPoint.trim() || painPoint,
      benefits,
      primaryCta: form.primaryCta === "Buy Now" ? cta : undefined,
    };
  }

  return {
    offerName: form.offerName.trim() || (offer ? toTitleCase(offer) : profile.offerPlaceholder.replace("e.g. ", "")),
    category,
    price: form.price.trim() || inferPrice(category, seed || offer),
    description: form.description.trim() || buildDescriptionSuggestion(offer, audience, profile),
    targetAudience: form.targetAudience.trim() || audience,
    painPoint: form.painPoint.trim() || painPoint,
    benefits,
    socialProof: form.socialProof.trim() || profile.socialProofChips[0],
    primaryCta: cta,
    brandTone: form.brandTone === "Professional" ? inferToneFromText(seed) : form.brandTone,
    platforms: inferPlatforms(category),
  };
}

function buildStarterDraft(form: OfferFormInput, profile: CategoryProfile) {
  const offer = form.offerName.trim() || "this offer";
  const audience = form.targetAudience.trim() || profile.audienceChips[0];
  const tone = form.brandTone.toLowerCase();
  const categoryLabel = form.category.toLowerCase();

  let description = `A ${tone} ${categoryLabel} offer for ${audience} that helps them get a clearer result without extra friction.`;
  let painPoint = `${audience} are tired of piecing things together manually and losing time on a problem that should feel easier to solve.`;
  let benefits: [string, string, string] = [
    `${offer} makes the value clear before the buyer has to overthink it`,
    "It reduces wasted time, second-guessing, or repeat effort",
    "It helps them feel confident choosing an option built for their situation",
  ];

  if (form.category === "Physical Product") {
    description = `A ${tone} physical product for ${audience} that turns a daily buying decision into a more useful, reliable upgrade.`;
    painPoint = `${audience} are tired of products that look promising online but feel flimsy, wasteful, or forgettable in daily use.`;
    benefits = [
      `${offer} makes the routine feel easier or more satisfying from day one`,
      "It gives buyers a practical reason to choose this instead of a cheaper substitute",
      "It makes the purchase feel credible, useful, and worth repeating",
    ];
  } else if (form.category === "SaaS") {
    description = `A ${tone} SaaS offer for ${audience} that turns a messy workflow into a clearer, repeatable operating system.`;
    painPoint = `${audience} are stuck with manual steps, scattered context, and slow handoffs that make growth harder to manage.`;
    benefits = [
      `${offer} makes the workflow easier to see and improve`,
      "It reduces repetitive manual work before it slows the team down",
      "It helps the team stay consistent as volume or complexity grows",
    ];
  } else if (form.category === "Service") {
    description = `A ${tone} service offer for ${audience} that gets an important project handled without adding more internal coordination.`;
    painPoint = `${audience} know the work matters, but it keeps slipping because nobody has the time or specialist focus to own it.`;
    benefits = [
      `${offer} gives the buyer expert execution without extra project management`,
      "It turns a stalled priority into a clear deliverable",
      "It creates momentum faster than hiring or managing from scratch",
    ];
  } else if (form.category === "Digital Product") {
    description = `A ${tone} digital product for ${audience} that gives them a reusable shortcut to a result they can apply quickly.`;
    painPoint = `${audience} are tired of piecing together scattered advice and losing momentum before they get to a usable result.`;
    benefits = [
      `${offer} gives the buyer a practical starting point instead of another abstract framework`,
      "It reduces setup time, second-guessing, and blank-page friction",
      "It makes progress feel faster because the structure is already there",
    ];
  } else if (form.category === "Course") {
    description = `A ${tone} course offer for ${audience} that turns a confusing topic into a practical path they can follow with confidence.`;
    painPoint = `${audience} want the outcome, but the jargon, scattered advice, and fear of mistakes keep slowing them down.`;
    benefits = [
      `${offer} breaks the learning path into clear actions they can actually follow`,
      "It helps them build confidence before they waste time or budget",
      "It shortens the gap between learning something and using it well",
    ];
  }

  const socialProof = profile.socialProofChips[0];

  return { description, painPoint, benefits, socialProof };
}

export function GenerateCampaignForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoDraftTimerRef = useRef<number | null>(null);
  const autoDraftRequestRef = useRef(0);
  const dependencyDraftTimerRef = useRef<number | null>(null);
  const dependencyDraftRequestRef = useRef(0);
  const lastAutoDraftKeyRef = useRef("");
  const lastDependencyDraftKeyRef = useRef("");
  const autoHighlightTimerRef = useRef<number | null>(null);
  const formStartRef = useRef<HTMLDivElement | null>(null);
  const handledStoredIdeaRef = useRef(false);
  const toastCounter = useRef(0);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OfferFormInput>(INITIAL_FORM_STATE);
  const [ideaInput, setIdeaInput] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [assistMessage, setAssistMessage] = useState<string | null>(null);
  const [suggestedBy, setSuggestedBy] = useState<Partial<Record<FormFieldKey, "ai" | "heuristic">>>({});
  const [highlightedFields, setHighlightedFields] = useState<Partial<Record<FormFieldKey, boolean>>>({});
  const [autoDraftState, setAutoDraftState] = useState<"idle" | "drafting" | "refining">("idle");
  const [loadingState, setLoadingState] = useState<"idle" | "strategy" | "content" | "saving">("idle");
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [streamedText, setStreamedText] = useState("");
  const [streamProgress, setStreamProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generationIssues, setGenerationIssues] = useState<GenerationIssue[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlExtractState, setUrlExtractState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [urlExtractMessage, setUrlExtractMessage] = useState("");
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [brandSaveName, setBrandSaveName] = useState("");
  const [brandSaveError, setBrandSaveError] = useState("");
  const [brandSaveBusy, setBrandSaveBusy] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<FormFieldKey, boolean>>>({});
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward");

  const profile = CATEGORY_PROFILES[form.category];
  const normalized = useMemo(() => normalizeOfferInput(form), [form]);
  const stepReadyText = useMemo(() => renderMissingStepText(step, form), [form, step]);
  const livePreview = useMemo(() => {
    const safeForm = buildReliableFormPayload(form);
    const audienceSnippet = safeForm.targetAudience.replace(/\.$/, "").split(" ").slice(0, 8).join(" ");
    const painSnippet = safeForm.painPoint
      .replace(/^they\s+are\s+/i, "")
      .replace(/^they\s+/i, "")
      .replace(/\.$/, "");
    const offer = safeForm.offerName || "This offer";
    const categoryHooks: Record<OfferFormInput["category"], { headline: string; hook: string; cta: string }> = {
      "Physical Product": {
        headline: `${offer} helps ${audienceSnippet} upgrade an everyday choice with something more reliable.`,
        hook: `For buyers tired of ${painSnippet}.`,
        cta: safeForm.primaryCta === "Buy Now" ? `Buy ${offer}` : safeForm.primaryCta,
      },
      "Digital Product": {
        headline: `${offer} gives ${audienceSnippet} a faster path to a usable result.`,
        hook: `For people stuck with ${painSnippet}.`,
        cta: safeForm.primaryCta === "Download" ? `Download ${offer}` : safeForm.primaryCta,
      },
      Service: {
        headline: `${offer} helps ${audienceSnippet} get important work handled without extra coordination.`,
        hook: `For teams dealing with ${painSnippet}.`,
        cta: safeForm.primaryCta === "Book a Call" ? `Book a Call for ${offer}` : safeForm.primaryCta,
      },
      SaaS: {
        headline: `${offer} helps ${audienceSnippet} run a clearer, more repeatable workflow.`,
        hook: `For teams slowed down by ${painSnippet}.`,
        cta: safeForm.primaryCta === "Sign Up" ? `Sign Up for ${offer}` : safeForm.primaryCta,
      },
      Course: {
        headline: `${offer} gives ${audienceSnippet} a practical path they can apply with confidence.`,
        hook: `For learners blocked by ${painSnippet}.`,
        cta: safeForm.primaryCta === "Download" ? `Get Started with ${offer}` : safeForm.primaryCta,
      },
    };

    return categoryHooks[safeForm.category] ?? {
      headline: safeForm.description,
      hook: safeForm.description,
      cta: safeForm.primaryCta || inferCTA(safeForm),
    };
  }, [form]);

  const fieldErrors = useMemo(() => {
    const next: Partial<Record<FormFieldKey, string>> = {};

    if (!form.offerName.trim()) next.offerName = "Offer name is required.";
    if (!form.price || Number(form.price) <= 0) next.price = "Enter a valid price point.";
    if (!form.description.trim()) next.description = "Brief description is required.";
    if (!form.targetAudience.trim()) next.targetAudience = "Target audience is required.";
    if (!form.painPoint.trim()) next.painPoint = "Core pain point is required.";

    form.benefits.forEach((benefit, index) => {
      const key = benefitFieldKey(index as 0 | 1 | 2);
      if (!benefit.trim()) next[key] = `Benefit ${index + 1} is required.`;
    });

    if (form.platforms.length === 0) next.platforms = "Select at least one platform for generation.";

    return next;
  }, [form]);

  const isBusy = loadingState !== "idle";
  const loadingMsg = LOADING_MESSAGES[loadingMsgIdx] ?? LOADING_MESSAGES[0];
  const shouldShowError = (field: FormFieldKey) => submitAttempted || Boolean(touchedFields[field]);
  const canContinue = validateStep(form, step).length === 0;

  function showToast(message: string, type: ToastType = "info") {
    const id = ++toastCounter.current;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }

  const setField = <K extends keyof OfferFormInput>(key: K, value: OfferFormInput[K]) => {
    setAssistMessage(null);
    setForm((current) => autoFillForm({ ...current, [key]: value }));
  };

  const markFieldTouched = (field: FormFieldKey) => {
    setTouchedFields((current) => (current[field] ? current : { ...current, [field]: true }));
  };

  const nextStep = () => {
    const stepErrors = validateStep(form, step);
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      if (step === 1) {
        setTouchedFields((current) => ({ ...current, offerName: true, category: true, price: true, description: true }));
      } else if (step === 2) {
        setTouchedFields((current) => ({
          ...current,
          targetAudience: true,
          painPoint: true,
          "benefit-0": true,
          "benefit-1": true,
          "benefit-2": true,
        }));
      } else if (step === 3) {
        setTouchedFields((current) => ({ ...current, primaryCta: true, brandTone: true, platforms: true }));
      }
      return;
    }

    setErrors([]);
    setTransitionDirection("forward");
    setStep((current) => Math.min(current + 1, 4));
  };

  const previousStep = () => {
    setErrors([]);
    setTransitionDirection("backward");
    setStep((current) => Math.max(current - 1, 1));
  };

  const goToStep = (target: number) => {
    if (target < step) {
      setErrors([]);
      setTransitionDirection("backward");
      setStep(target);
    }
  };

  const handleAssistFill = () => {
    const starter = buildStarterDraft(form, profile);

    setForm((current) => autoFillForm({
      ...current,
      description: current.description.trim() ? current.description : starter.description,
      painPoint: current.painPoint.trim() ? current.painPoint : starter.painPoint,
      benefits: current.benefits.some((item) => !item.trim())
        ? (current.benefits.map((item, index) => item.trim() ? item : starter.benefits[index]) as [string, string, string])
        : current.benefits,
      socialProof: current.socialProof.trim() ? current.socialProof : starter.socialProof,
    }));

    setAssistMessage("Starter copy added. Review and edit anything before continuing.");
  };

  const applyPlatformToggle = (platformKey: OfferFormInput["platforms"][number]) => {
    const selected = form.platforms.includes(platformKey);
    if (selected && form.platforms.length === 1) {
      return;
    }
    const next = selected
      ? form.platforms.filter((platform) => platform !== platformKey)
      : [...form.platforms, platformKey];

    markFieldTouched("platforms");
    setField("platforms", next);
  };

  const markSuggestedFields = (fields: FormFieldKey[], source: "ai" | "heuristic") => {
    if (fields.length === 0) return;

    setSuggestedBy((current) => {
      const next = { ...current };
      fields.forEach((field) => {
        next[field] = source;
      });
      return next;
    });

    setHighlightedFields((current) => {
      const next = { ...current };
      fields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });

    if (autoHighlightTimerRef.current) {
      clearTimeout(autoHighlightTimerRef.current);
    }

    autoHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedFields({});
    }, 1600);
  };

  const applyDraftSuggestion = (
    suggestion: AssistDraft,
    source: "ai" | "heuristic",
    options?: { fillAll?: boolean; setStepTo?: number; announce?: string },
  ) => {
    const changedFields: FormFieldKey[] = [];

    startTransition(() => {
      setForm((current) => {
        const next = { ...current };
        const fillAll = options?.fillAll === true;

        const maybeSet = <K extends keyof OfferFormInput>(field: K, value: OfferFormInput[K] | undefined, key?: FormFieldKey) => {
          if (value === undefined) return;
          const targetKey = (key ?? field) as FormFieldKey;
          const currentValue = next[field];
          const shouldWrite = fillAll
            ? JSON.stringify(currentValue) !== JSON.stringify(value)
            : (
              Array.isArray(currentValue)
                ? currentValue.every((item) => !String(item).trim())
                : !String(currentValue ?? "").trim()
            );

          if (!shouldWrite) return;
          next[field] = value;
          changedFields.push(targetKey);
        };

        maybeSet("offerName", suggestion.offerName, "offerName");
        maybeSet("category", suggestion.category, "category");
        maybeSet("price", suggestion.price, "price");
        maybeSet("description", suggestion.description, "description");
        maybeSet("targetAudience", suggestion.targetAudience, "targetAudience");
        maybeSet("painPoint", suggestion.painPoint, "painPoint");
        maybeSet("socialProof", suggestion.socialProof, "socialProof");
        maybeSet("primaryCta", suggestion.primaryCta, "primaryCta");
        maybeSet("brandTone", suggestion.brandTone, "brandTone");
        maybeSet("platforms", suggestion.platforms, "platforms");

        if (suggestion.benefits) {
          const benefitValue = suggestion.benefits;
          if (fillAll || next.benefits.every((item) => !item.trim())) {
            next.benefits = benefitValue;
            changedFields.push("benefit-0", "benefit-1", "benefit-2");
          } else {
            const updated = [...next.benefits] as OfferFormInput["benefits"];
            benefitValue.forEach((benefit, index) => {
              if (!updated[index].trim()) {
                updated[index] = benefit;
                changedFields.push(benefitFieldKey(index as 0 | 1 | 2));
              }
            });
            next.benefits = updated;
          }
        }

        return autoFillForm(next);
      });
    });

    if (changedFields.length > 0) {
      markSuggestedFields(changedFields, source);
    }

    if (options?.setStepTo) {
      setStep(options.setStepTo);
    }

    if (options?.announce) {
      setAssistMessage(options.announce);
    }
  };

  const requestAssist = async (
    mode: "draft" | "full",
    payload: { idea?: string; offerData: Partial<OfferFormInput> },
  ) => {
    return fetchJsonWithTimeout<AssistResponseBody>(
      "/api/assist",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, ...payload }),
      },
      25_000,
    );
  };

  const extractUrlDetails = async () => {
    const url = urlInput.trim();
    if (!url) {
      setUrlExtractState("error");
      setUrlExtractMessage("Paste a public product URL first.");
      return;
    }

    setUrlExtractState("loading");
    setUrlExtractMessage("");

    try {
      const payload = await fetchJsonWithTimeout<UrlExtractResponse>(
        "/api/extract-url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        },
        15_000,
      );

      if (!payload.extracted) {
        throw new Error(payload.error || "Could not extract product details from this page.");
      }

      const extracted = payload.extracted;
      const benefits = [...extracted.benefits].filter(Boolean);
      while (benefits.length < 3) {
        benefits.push("");
      }

      setForm((current) => autoFillForm({
        ...current,
        sourceUrl: extracted.sourceUrl,
        inputType: "url",
        offerName: extracted.offerName || current.offerName,
        category: extracted.category || current.category,
        price: extracted.price || current.price,
        description: extracted.description.slice(0, 200) || current.description,
        targetAudience: extracted.targetAudience || current.targetAudience,
        painPoint: extracted.painPoint || current.painPoint,
        benefits: benefits.slice(0, 3) as [string, string, string],
        socialProof: extracted.socialProof || current.socialProof,
        platforms: current.platforms.length > 0 ? current.platforms : inferPlatforms(extracted.category),
      }));

      markSuggestedFields(
        [
          "offerName",
          "category",
          "price",
          "description",
          "targetAudience",
          "painPoint",
          "benefit-0",
          "benefit-1",
          "benefit-2",
          "socialProof",
        ],
        "heuristic",
      );
      setStep(1);
      setUrlExtractState("success");
      setUrlExtractMessage("We found your product details. Review and edit below.");
    } catch (error) {
      setUrlExtractState("error");
      setUrlExtractMessage(
        error instanceof Error
          ? error.message
          : "Could not analyze that URL. You can still continue manually.",
      );
    }
  };

  const applyConversationSuggestion = (suggestion: AssistDraft, announce?: string) => {
    applyDraftSuggestion(suggestion, "ai", {
      fillAll: true,
      announce,
    });
  };

  const runOneClickStart = async () => {
    const idea = ideaInput.trim();
    if (!idea) {
      setAssistMessage("Type one short idea first, then we will draft the rest.");
      return;
    }

    const heuristic = buildHeuristicSuggestion(form, CATEGORY_PROFILES[inferCategoryFromText(idea) ?? form.category], "full", idea);
    applyDraftSuggestion(heuristic, "heuristic", {
      fillAll: true,
      setStepTo: 4,
      announce: "Building your starter draft now. Steps 1 to 3 are filling in for you.",
    });
    setAutoDraftState("drafting");

    try {
      const aiResponse = await requestAssist("full", {
        idea,
        offerData: {
          ...form,
          ...heuristic,
        },
      });

      applyDraftSuggestion(aiResponse.suggestion, "ai", {
        fillAll: true,
        setStepTo: 4,
        announce: "Starter draft is ready. Review it, tweak anything you want, and generate when ready.",
      });
    } catch {
      setAssistMessage("Starter draft added from smart local suggestions. You can edit anything from here.");
    } finally {
      setAutoDraftState("idle");
    }
  };

  useEffect(() => {
    return () => {
      if (autoDraftTimerRef.current) clearTimeout(autoDraftTimerRef.current);
      if (dependencyDraftTimerRef.current) clearTimeout(dependencyDraftTimerRef.current);
      if (autoHighlightTimerRef.current) clearTimeout(autoHighlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadBrands() {
      try {
        const response = await fetch("/api/brands");
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore) {
          setBrands(data.brands ?? []);
        }
      } catch {
        if (!ignore) setBrands([]);
      }
    }

    void loadBrands();

    return () => {
      ignore = true;
    };
  }, []);

  const applyBrandProfile = (brandId: string) => {
    setSelectedBrandId(brandId);
    const brand = brands.find((item) => item.id === brandId);
    if (!brand) return;

    const firstVoice = brand.brand_voice?.[0];
    const brandTone = brandToneOptions.find((option) => option === firstVoice) ?? form.brandTone;
    const preferredCta = primaryCtaOptions.find((option) => option === brand.preferred_cta) ?? form.primaryCta;

    setForm((current) => autoFillForm({
      ...current,
      targetAudience: brand.target_audience || current.targetAudience,
      brandTone,
      primaryCta: preferredCta,
    }));
    setAssistMessage(`Applied ${brand.name}. Review the pre-filled audience and tone below.`);
  };

  const saveCurrentAsBrand = async () => {
    const name = brandSaveName.trim() || form.offerName.trim();
    if (!name) {
      setBrandSaveError("Add a brand name before saving.");
      return;
    }

    setBrandSaveBusy(true);
    setBrandSaveError("");

    try {
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          industry: form.category,
          target_audience: form.targetAudience,
          brand_voice: [form.brandTone],
          approved_claims: form.socialProof ? [form.socialProof] : [],
          preferred_cta: form.primaryCta,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save brand profile.");
      setBrands((current) => [data.brand, ...current]);
      setSelectedBrandId(data.brand.id);
      setBrandModalOpen(false);
      setBrandSaveName("");
      showToast("Brand profile saved.", "success");
    } catch (error) {
      setBrandSaveError(error instanceof Error ? error.message : "Could not save brand profile.");
    } finally {
      setBrandSaveBusy(false);
    }
  };

  useEffect(() => {
    const offerName = form.offerName.trim();
    const description = form.description.trim();
    const hasEnoughSignal = offerName.length >= 4 || description.length >= 12;
    const shouldFillDraft =
      !form.description.trim() ||
      !form.targetAudience.trim() ||
      !form.painPoint.trim() ||
      form.benefits.some((benefit) => !benefit.trim());
    const draftKey = `${offerName}|${description}|${form.category}`;

    if (!hasEnoughSignal || !shouldFillDraft || isBusy || lastAutoDraftKeyRef.current === draftKey) {
      return;
    }

    lastAutoDraftKeyRef.current = draftKey;

    const kickoffTimer = window.setTimeout(() => {
      const heuristicSuggestion = buildHeuristicSuggestion(form, profile, "draft");
      applyDraftSuggestion(heuristicSuggestion, "heuristic", {
        announce: "Filling the missing fields with category-aware starter copy.",
      });
      setAutoDraftState("drafting");
    }, 0);

    const requestId = ++autoDraftRequestRef.current;
    if (autoDraftTimerRef.current) clearTimeout(autoDraftTimerRef.current);

    autoDraftTimerRef.current = window.setTimeout(async () => {
      try {
        setAutoDraftState("refining");
        const aiResponse = await requestAssist("draft", {
          offerData: form,
        });

        if (requestId !== autoDraftRequestRef.current) return;

        applyDraftSuggestion(aiResponse.suggestion, "ai", {
          announce: "AI tightened the draft while keeping the category and tone aligned.",
        });
      } catch {
        if (requestId !== autoDraftRequestRef.current) return;
      } finally {
        if (requestId === autoDraftRequestRef.current) {
          setAutoDraftState("idle");
        }
      }
    }, 900);

    return () => {
      clearTimeout(kickoffTimer);
    };
  }, [form.offerName, form.description, form.category]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const hasAudience = form.targetAudience.trim().length >= 6;
    const hasPain = form.painPoint.trim().length >= 8;
    const hasBenefits = form.benefits.some((benefit) => benefit.trim().length >= 8);
    const shouldFillPain = hasAudience && !form.painPoint.trim();
    const shouldFillBenefits = hasPain && form.benefits.some((benefit) => !benefit.trim());
    const shouldFillCta = hasBenefits && form.primaryCta === "Buy Now";

    if (!shouldFillPain && !shouldFillBenefits && !shouldFillCta) return;

    const heuristicSuggestion: AssistDraft = {};
    if (shouldFillPain) {
      heuristicSuggestion.painPoint = buildPainPointSuggestion(form.targetAudience, profile);
    }
    if (shouldFillBenefits) {
      heuristicSuggestion.benefits = buildBenefitSuggestions(form.painPoint || form.targetAudience, profile);
    }
    if (shouldFillCta) {
      heuristicSuggestion.primaryCta = inferCtaFromBenefits(form.benefits, form.category);
    }

    const timer = window.setTimeout(() => {
      applyDraftSuggestion(heuristicSuggestion, "heuristic");
    }, 0);

    const shouldRefineWithAi = (hasAudience || hasPain) && !isBusy;
    const dependencyKey = `${form.targetAudience.trim()}|${form.painPoint.trim()}|${form.benefits.join("|")}|${form.category}`;

    if (shouldRefineWithAi && lastDependencyDraftKeyRef.current !== dependencyKey) {
      lastDependencyDraftKeyRef.current = dependencyKey;
      const requestId = ++dependencyDraftRequestRef.current;

      if (dependencyDraftTimerRef.current) clearTimeout(dependencyDraftTimerRef.current);

      dependencyDraftTimerRef.current = window.setTimeout(async () => {
        try {
          setAutoDraftState("refining");
          const aiResponse = await requestAssist("draft", { offerData: form });
          if (requestId !== dependencyDraftRequestRef.current) return;

          applyDraftSuggestion(aiResponse.suggestion, "ai", {
            announce: "Suggestions updated to match the audience and pain point you added.",
          });
        } catch {
          if (requestId !== dependencyDraftRequestRef.current) return;
        } finally {
          if (requestId === dependencyDraftRequestRef.current) {
            setAutoDraftState("idle");
          }
        }
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [form.targetAudience, form.painPoint, form.benefits, form.primaryCta, form.category, isBusy, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (overrideForm?: OfferFormInput) => {
    const submissionForm = buildReliableFormPayload(overrideForm ?? form);
    setForm(submissionForm);
    setSubmitAttempted(true);

    setErrors([]);
    setSubmitError(null);
    setGenerationIssues([]);
    setStreamedText("");
    setStreamProgress(0);
    setLoadingState("strategy");
    setLoadingMsgIdx(0);

    const generateCampaign = async () => {
      let interval: ReturnType<typeof setInterval> | null = null;

      interval = setInterval(() => {
        setLoadingMsgIdx((current) => (current + 1) % LOADING_MESSAGES.length);
      }, 3500);

      try {
        const normalizedSubmission = normalizeOfferInput(submissionForm);

        const strategyResponse = await fetch(
          "/api/strategy/stream",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ offerData: normalizedSubmission }),
          },
        );

        if (!strategyResponse.ok) {
          const payload = await strategyResponse.json().catch(() => ({}));
          throw new Error(buildRequestErrorMessage("Generation is taking longer than expected. Please try again.", payload));
        }

        const reader = strategyResponse.body?.getReader();
        if (!reader) {
          throw new Error("Strategy stream could not be opened. Please try again.");
        }

        const decoder = new TextDecoder();
        let accumulated = "";
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulated += decoder.decode(value, { stream: true });
          chunkCount += 1;
          setStreamedText(accumulated);
          setStreamProgress((current) => Math.min(95, Math.max(current + 4, Math.min(80, chunkCount * 4))));
        }

        accumulated += decoder.decode();
        setStreamedText(accumulated);
        setStreamProgress(100);

        let strategyBrief: StrategyBrief;
        try {
          strategyBrief = parseStreamedStrategy(accumulated);
        } catch {
          const fallbackPayload = await fetchJsonWithTimeout<{ strategyBrief: StrategyBrief }>(
            "/api/strategy",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ offerData: normalizedSubmission }),
            },
          );
          strategyBrief = fallbackPayload.strategyBrief;
        }

        setLoadingState("content");

        const generationPayload = await fetchJsonWithTimeout<GenerateResponseBody>(
          "/api/generate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              offerData: normalizedSubmission,
              strategyBrief,
              platforms: normalizedSubmission.platforms,
            }),
          },
        );

        setGenerationIssues(generationPayload.failedPlatforms);
        setLoadingState("saving");

        const commerceScores = calculateCommerceScores(normalizedSubmission, strategyBrief);
        const savePayload: SaveCampaignRequestBody = {
          offerData: normalizedSubmission,
          strategyBrief,
          generatedContent: generationPayload.generatedContent,
          commerceScores,
        };

        const saveResult = await fetchJsonWithTimeout<{ campaign: { id: string } }>(
          "/api/campaigns",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(savePayload),
          },
        );

        const warningQuery = generationPayload.failedPlatforms.length > 0 ? "?partial=1" : "";
        router.push(`/results/${saveResult.campaign.id}${warningQuery}`);
      } finally {
        if (interval) window.clearInterval(interval);
      }
    };

    try {
      await generateCampaign();
    } catch {
      try {
      showToast("Generation stopped before saving. Retrying once automatically.", "info");
        await generateCampaign();
      } catch (retryError) {
        setLoadingState("idle");
        setSubmitError(retryError instanceof Error ? retryError.message : "Generation could not finish after one retry.");
      }
    }
  };

  const startStoredIdeaFlow = useEffectEvent((idea: ProductIdea | null) => {
    if (!idea) {
      setSubmitError("The selected idea could not be loaded. Please choose another one.");
      return;
    }

    const nextForm = autoFillForm({
      sourceUrl: "",
      inputType: "description",
      offerName: idea.productName,
      category: idea.category,
      price: idea.estimatedPrice.replace(/[^0-9.]/g, "") || "29",
      description: idea.description,
      targetAudience: idea.targetAudience,
      painPoint: idea.painPoint,
      benefits: idea.benefits,
      socialProof: idea.socialProof,
      primaryCta: idea.primaryCta,
      brandTone: idea.brandTone,
      platforms: idea.platforms.length > 0 ? idea.platforms : inferPlatforms(idea.category),
    });

    setIdeaInput(`${idea.productName} for ${idea.targetAudience}`);
    setForm(nextForm);
    setStep(4);
    setAssistMessage(`Loaded "${idea.productName}". Generating the campaign pack now.`);
    void handleSubmit(nextForm);
  });

  useEffect(() => {
    if (handledStoredIdeaRef.current) return;
    if (searchParams.get("idea") !== "1") return;

    const raw = window.sessionStorage.getItem(IDEA_STORAGE_KEY);
    if (!raw) return;

    handledStoredIdeaRef.current = true;
    window.sessionStorage.removeItem(IDEA_STORAGE_KEY);
    router.replace("/generate");

    let parsedIdea: ProductIdea | null = null;

    try {
      parsedIdea = JSON.parse(raw) as ProductIdea;
    } catch {
      parsedIdea = null;
    }

    const timer = window.setTimeout(() => {
      startStoredIdeaFlow(parsedIdea);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router, searchParams]);

  return (
    <div className="generate-shell page-enter">
      <ToastContainer toasts={toasts} />
      <header className="app-nav">
        <div className="app-nav-inner" style={{ maxWidth: "760px" }}>
          <Link href="/" className="nav-logo">Cloud Nexus AI</Link>
          <Link href="/dashboard" style={{ fontSize: "13px", color: "var(--color-text-secondary)", fontWeight: 500 }}>
            Dashboard
          </Link>
        </div>
      </header>

      <main className="generate-main">
        <div className="stepper">
          {STEP_LABELS.map((label, index) => {
            const currentStep = index + 1;
            const done = currentStep < step;
            const current = currentStep === step;

            return (
              <div key={label} className="stepper-item">
                <div style={{ flex: 1 }}>
                  <div className="stepper-node-wrap">
                  <button
                    type="button"
                    onClick={() => goToStep(currentStep)}
                    disabled={currentStep > step}
                    aria-label={`${done ? "Completed: " : current ? "Current: " : ""}Step ${currentStep} ${label}`}
                    className={`stepper-node${current ? " stepper-node-current" : ""}${done ? " stepper-node-complete" : ""}`}
                    style={{ cursor: currentStep < step ? "pointer" : "default" }}
                  >
                    {done ? <Check style={{ width: "12px", height: "12px" }} aria-hidden="true" /> : currentStep}
                  </button>
                    {index < STEP_LABELS.length - 1 && (
                      <span className={`stepper-line${done ? " stepper-line-complete" : ""}`} aria-hidden="true" />
                    )}
                  </div>
                  <div className="stepper-label" style={{ color: current ? "var(--color-primary)" : undefined }}>
                    {label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <section style={{ marginBottom: "24px" }}>
          <p className="step-header-kicker">
            Step {step} of 4
          </p>
          <h1 className="step-header-title">
            {STEP_META[step - 1].heading}
          </h1>
          <p className="step-header-copy">
            {STEP_META[step - 1].sub}
          </p>
          <div className="callout callout-subtle">
            <span className="callout-label">Guide</span>
            <p className="callout-copy">{STEP_META[step - 1].required}</p>
          </div>
        </section>

        <ConversationAssist
          form={form}
          onApplySuggestion={applyConversationSuggestion}
          onSwitchToForm={() => {
            setStep(1);
            formStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />

        <div ref={formStartRef} />

        {brands.length > 0 && (
          <div className="assist-panel" style={{ marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <p className="assist-title">
                <Sparkles style={{ width: "14px", height: "14px" }} aria-hidden="true" />
                Brand memory
              </p>
              <p className="assist-copy">
                Select a saved brand to pre-fill audience and voice.
              </p>
            </div>
            <select
              value={selectedBrandId}
              onChange={(event) => applyBrandProfile(event.target.value)}
              className="input select-input"
              style={{ minWidth: "220px", maxWidth: "320px" }}
              aria-label="Saved brand profile"
            >
              <option value="">Choose brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
            <Link href="/brands" className="btn-ghost">Manage</Link>
          </div>
        )}

        <div
          style={{
            background: "#F0F9FF",
            border: "1px solid #BAE6FD",
            borderRadius: "12px",
            padding: "20px 24px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 800, color: "#075985", fontSize: "16px" }}>
                Start with a URL (optional)
              </p>
              <p style={{ margin: 0, color: "#0369A1", fontSize: "14px", lineHeight: 1.5 }}>
                Paste your product URL and we&apos;ll fill in your brief automatically
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                className="input"
                placeholder="https://your-shopify-store.com/products/..."
                aria-label="Product URL"
                style={{ flex: "1 1 280px", background: "white" }}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => void extractUrlDetails()}
                disabled={urlExtractState === "loading" || isBusy}
                style={{ minWidth: "170px", justifyContent: "center" }}
              >
                {urlExtractState === "loading" && <span className="spinner" aria-hidden="true" />}
                {urlExtractState === "loading" ? "Analyzing your page..." : "Extract Details →"}
              </button>
            </div>
            {urlExtractMessage && (
              <p
                role={urlExtractState === "error" ? "alert" : "status"}
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: urlExtractState === "error" ? "#B91C1C" : "#047857",
                  fontWeight: 600,
                }}
              >
                {urlExtractMessage}
              </p>
            )}
          </div>
        </div>

        {step === 1 && (
          <div className="assist-panel" style={{ marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <p className="assist-title">
                <WandSparkles style={{ width: "14px", height: "14px" }} aria-hidden="true" />
                One-click start
              </p>
              <p className="assist-copy" style={{ marginBottom: "10px" }}>
                Type one rough sentence and let the assistant draft steps 1 to 3 for you.
              </p>
              <input
                value={ideaInput}
                onChange={(event) => setIdeaInput(event.target.value)}
                className="input"
                placeholder="e.g. bamboo toothbrush for eco people"
                aria-label="Campaign idea"
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void runOneClickStart()}
              disabled={autoDraftState !== "idle" || isBusy}
              style={{ minWidth: "190px" }}
            >
              {autoDraftState !== "idle" && <span className="spinner" aria-hidden="true" />}
              Generate from idea →
            </button>
          </div>
        )}

        {(step === 1 || step === 2) && (
          <div className="assist-panel" style={{ marginBottom: "20px" }}>
            <div>
              <p className="assist-title">
                <Sparkles style={{ width: "14px", height: "14px" }} aria-hidden="true" />
                Help me fill this
              </p>
              <p className="assist-copy">
                Use what you already typed to draft the missing fields faster. Background suggestions also keep improving as you type.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAssistFill}
              disabled={isBusy}
              style={{ padding: "8px 14px", fontSize: "13px" }}
            >
              Fill smart starters
            </button>
          </div>
        )}

        {autoDraftState !== "idle" && (
          <div className="callout callout-subtle" style={{ marginBottom: "20px" }}>
            <span className="callout-label">Draft</span>
            <p className="callout-copy">
              {autoDraftState === "drafting"
                ? "Adding a fast first pass now."
                : "Refining your draft with AI so the wording is stronger."}
            </p>
          </div>
        )}

        {assistMessage && (
          <div className="callout callout-success" style={{ marginBottom: "20px" }}>
            <span className="callout-label">Updated</span>
            <p className="callout-copy">{assistMessage}</p>
          </div>
        )}

        {submitAttempted && errors.length > 0 && (
          <div role="alert" className="callout callout-error" style={{ marginBottom: "20px" }}>
            <AlertCircle style={{ width: "14px", height: "14px", marginTop: "2px", flexShrink: 0 }} aria-hidden="true" />
            <div>
              {errors.map((error) => (
                <p key={error} className="callout-copy">{error}</p>
              ))}
            </div>
          </div>
        )}

        {submitError && (
          <div role="alert" className="callout callout-error" style={{ marginBottom: "20px" }}>
            <AlertCircle style={{ width: "14px", height: "14px", marginTop: "2px", flexShrink: 0 }} aria-hidden="true" />
            <div>
              <p className="callout-copy">{submitError}</p>
              <p className="callout-copy" style={{ marginTop: "4px", color: "var(--color-text-secondary)" }}>
                Nothing was lost. Retry in a moment, or simplify the offer description if the same error returns.
              </p>
            </div>
          </div>
        )}

        {generationIssues.length > 0 && (
          <div className="callout callout-warning" style={{ marginBottom: "20px" }}>
            <AlertCircle style={{ width: "14px", height: "14px", marginTop: "2px", flexShrink: 0 }} aria-hidden="true" />
            <div>
              <span className="callout-label">Partial generation</span>
              <p className="callout-copy">
                Saved with missing sections that can be retried: {generationIssues.map((issue) => PLATFORM_LABELS[issue.platform]).join(", ")}.
              </p>
            </div>
          </div>
        )}

        <div
          key={step}
          className={`step-transition ${transitionDirection === "forward" ? "step-transition-forward" : "step-transition-backward"}`}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          {step === 1 && (
            <>
              <Field
                label="Offer name"
                inputId="offer-name"
                helper="Use the name a buyer would recognize instantly."
                error={shouldShowError("offerName") ? fieldErrors.offerName : undefined}
                suggestionTag={suggestedBy.offerName}
                highlighted={Boolean(highlightedFields.offerName)}
              >
                <input
                  id="offer-name"
                  value={form.offerName}
                  onChange={(event) => setField("offerName", event.target.value)}
                  onBlur={() => markFieldTouched("offerName")}
                  className={`input${shouldShowError("offerName") && fieldErrors.offerName ? " input-invalid" : ""}`}
                  aria-invalid={Boolean(shouldShowError("offerName") && fieldErrors.offerName)}
                  aria-describedby={joinDescribedBy(
                    "offer-name-helper",
                    shouldShowError("offerName") && fieldErrors.offerName ? "offer-name-error" : undefined,
                  )}
                  placeholder={profile.offerPlaceholder}
                />
              </Field>

              <div style={{ display: "grid", gap: "16px" }} className="sm:grid-cols-2">
                <Field
                  label="Category"
                  inputId="category"
                  helper="This tunes the examples, hints, and starter suggestions throughout the form."
                  suggestionTag={suggestedBy.category}
                  highlighted={Boolean(highlightedFields.category)}
                >
                  <select
                    id="category"
                    value={form.category}
                    onChange={(event) => setField("category", event.target.value as OfferFormInput["category"])}
                    onBlur={() => markFieldTouched("category")}
                    className="input select-input"
                    style={{ cursor: "pointer" }}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <SuggestionRow
                    label="Quick picks"
                    suggestions={categoryOptions.map((option) => ({
                      label: option,
                      active: form.category === option,
                      onClick: () => setField("category", option),
                    }))}
                  />
                </Field>

                <Field
                  label="Price point"
                  inputId="price"
                  helper="Use the main purchase price, even if bundles or plans exist."
                  error={shouldShowError("price") ? fieldErrors.price : undefined}
                  suggestionTag={suggestedBy.price}
                  highlighted={Boolean(highlightedFields.price)}
                >
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)", pointerEvents: "none" }}>
                      $
                    </span>
                    <input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(event) => setField("price", event.target.value)}
                      onBlur={() => markFieldTouched("price")}
                      className={`input${shouldShowError("price") && fieldErrors.price ? " input-invalid" : ""}`}
                      style={{ paddingLeft: "26px" }}
                      aria-invalid={Boolean(shouldShowError("price") && fieldErrors.price)}
                      aria-describedby={joinDescribedBy(
                        "price-helper",
                        shouldShowError("price") && fieldErrors.price ? "price-error" : undefined,
                      )}
                      placeholder="49"
                    />
                  </div>
                </Field>
              </div>

              <Field
                label="Description"
                inputId="description"
                labelHelper="What’s the outcome or transformation?"
                helper={profile.descriptionHint}
                footer={`${form.description.length}/200 characters`}
                error={shouldShowError("description") ? fieldErrors.description : undefined}
                suggestionTag={suggestedBy.description}
                highlighted={Boolean(highlightedFields.description)}
              >
                <textarea
                  id="description"
                  value={form.description}
                  maxLength={200}
                  onChange={(event) => setField("description", event.target.value)}
                  onBlur={() => markFieldTouched("description")}
                  className={`input${shouldShowError("description") && fieldErrors.description ? " input-invalid" : ""}`}
                  aria-invalid={Boolean(shouldShowError("description") && fieldErrors.description)}
                  aria-describedby={joinDescribedBy(
                    "description-helper",
                    "description-footer",
                    shouldShowError("description") && fieldErrors.description ? "description-error" : undefined,
                  )}
                  placeholder={profile.descriptionPlaceholder}
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field
                label="Target audience"
                inputId="target-audience"
                labelHelper="Who is this really for?"
                helper="Name the buyer in practical terms: who they are, what situation they are in, and what they care about."
                error={shouldShowError("targetAudience") ? fieldErrors.targetAudience : undefined}
                suggestionTag={suggestedBy.targetAudience}
                highlighted={Boolean(highlightedFields.targetAudience)}
              >
                <input
                  id="target-audience"
                  value={form.targetAudience}
                  onChange={(event) => setField("targetAudience", event.target.value)}
                  onBlur={() => markFieldTouched("targetAudience")}
                  className={`input${shouldShowError("targetAudience") && fieldErrors.targetAudience ? " input-invalid" : ""}`}
                  aria-invalid={Boolean(shouldShowError("targetAudience") && fieldErrors.targetAudience)}
                  aria-describedby={joinDescribedBy(
                    "target-audience-helper",
                    shouldShowError("targetAudience") && fieldErrors.targetAudience ? "target-audience-error" : undefined,
                  )}
                  placeholder={profile.audiencePlaceholder}
                />
                <SuggestionRow
                  label="Starter ideas"
                  suggestions={profile.audienceChips.map((suggestion) => ({
                    label: suggestion,
                    onClick: () => setField("targetAudience", suggestion),
                  }))}
                />
              </Field>

              <Field
                label="Core pain point"
                inputId="pain-point"
                labelHelper="What frustration are they trying to escape?"
                helper="Describe the frustration that exists before the buyer says yes."
                error={shouldShowError("painPoint") ? fieldErrors.painPoint : undefined}
                suggestionTag={suggestedBy.painPoint}
                highlighted={Boolean(highlightedFields.painPoint)}
              >
                <textarea
                  id="pain-point"
                  value={form.painPoint}
                  onChange={(event) => setField("painPoint", event.target.value)}
                  onBlur={() => markFieldTouched("painPoint")}
                  className={`input${shouldShowError("painPoint") && fieldErrors.painPoint ? " input-invalid" : ""}`}
                  aria-invalid={Boolean(shouldShowError("painPoint") && fieldErrors.painPoint)}
                  aria-describedby={joinDescribedBy(
                    "pain-point-helper",
                    shouldShowError("painPoint") && fieldErrors.painPoint ? "pain-point-error" : undefined,
                  )}
                  placeholder={profile.painPointPlaceholder}
                />
                <SuggestionRow
                  label="Starter ideas"
                  suggestions={profile.painPointChips.map((suggestion) => ({
                    label: suggestion,
                    onClick: () => setField("painPoint", replaceOrAppend(form.painPoint, suggestion)),
                  }))}
                />
              </Field>

              <div className="callout callout-subtle">
                <span className="callout-label">Benefits</span>
                <p className="callout-copy">Focus on the buyer outcome, not the technical feature list.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {form.benefits.map((benefit, index) => (
                  <Field
                    key={index}
                    label={`Benefit ${index + 1}`}
                    inputId={`benefit-${index}`}
                    labelHelper="What buyer outcome does this create?"
                    helper={index === 0 ? "Short, concrete, and buyer-facing works best." : undefined}
                    error={shouldShowError(benefitFieldKey(index as 0 | 1 | 2)) ? fieldErrors[benefitFieldKey(index as 0 | 1 | 2)] : undefined}
                    suggestionTag={suggestedBy[benefitFieldKey(index as 0 | 1 | 2)]}
                    highlighted={Boolean(highlightedFields[benefitFieldKey(index as 0 | 1 | 2)])}
                  >
                    <input
                      id={`benefit-${index}`}
                      value={benefit}
                      onChange={(event) => {
                        const next = [...form.benefits] as OfferFormInput["benefits"];
                        next[index] = event.target.value;
                        setField("benefits", next);
                      }}
                      onBlur={() => markFieldTouched(benefitFieldKey(index as 0 | 1 | 2))}
                      className={`input${shouldShowError(benefitFieldKey(index as 0 | 1 | 2)) && fieldErrors[benefitFieldKey(index as 0 | 1 | 2)] ? " input-invalid" : ""}`}
                      aria-invalid={Boolean(shouldShowError(benefitFieldKey(index as 0 | 1 | 2)) && fieldErrors[benefitFieldKey(index as 0 | 1 | 2)])}
                      aria-describedby={joinDescribedBy(
                        index === 0 ? `benefit-${index}-helper` : undefined,
                        shouldShowError(benefitFieldKey(index as 0 | 1 | 2)) && fieldErrors[benefitFieldKey(index as 0 | 1 | 2)] ? `benefit-${index}-error` : undefined,
                      )}
                      placeholder={profile.benefitPlaceholder}
                    />
                  </Field>
                ))}
              </div>

              <SuggestionRow
                label="Use a starter"
                suggestions={profile.benefitChips.map((suggestion) => ({
                  label: suggestion,
                  onClick: () => setField("benefits", fillFirstEmpty(form.benefits, suggestion)),
                }))}
              />

              <Field
                label="Social proof"
                inputId="social-proof"
                helper="Optional. Add trust signals if you have them, even if they are lightweight."
                optional
                suggestionTag={suggestedBy.socialProof}
                highlighted={Boolean(highlightedFields.socialProof)}
              >
                <textarea
                  id="social-proof"
                  value={form.socialProof}
                  onChange={(event) => setField("socialProof", event.target.value)}
                  className="input"
                  aria-describedby="social-proof-helper"
                  placeholder={profile.socialProofPlaceholder}
                />
                <SuggestionRow
                  label="Quick phrasing"
                  suggestions={profile.socialProofChips.map((suggestion) => ({
                    label: suggestion,
                    onClick: () => setField("socialProof", replaceOrAppend(form.socialProof, suggestion)),
                  }))}
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ display: "grid", gap: "16px" }} className="sm:grid-cols-2">
                <Field
                  label="Primary CTA"
                  inputId="primary-cta"
                  helper="Choose the main action you want this campaign to drive."
                  suggestionTag={suggestedBy.primaryCta}
                  highlighted={Boolean(highlightedFields.primaryCta)}
                >
                  <select
                    id="primary-cta"
                    value={form.primaryCta}
                    onChange={(event) => setField("primaryCta", event.target.value as OfferFormInput["primaryCta"])}
                    onBlur={() => markFieldTouched("primaryCta")}
                    className="input select-input"
                    style={{ cursor: "pointer" }}
                  >
                    {primaryCtaOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <SuggestionRow
                    label="Quick picks"
                    suggestions={primaryCtaOptions.map((option) => ({
                      label: option,
                      active: form.primaryCta === option,
                      onClick: () => setField("primaryCta", option),
                    }))}
                  />
                </Field>

                <Field
                  label="Brand tone"
                  inputId="brand-tone"
                  helper="This shapes how the strategy and platform copy will sound."
                  suggestionTag={suggestedBy.brandTone}
                  highlighted={Boolean(highlightedFields.brandTone)}
                >
                  <select
                    id="brand-tone"
                    value={form.brandTone}
                    onChange={(event) => setField("brandTone", event.target.value as OfferFormInput["brandTone"])}
                    onBlur={() => markFieldTouched("brandTone")}
                    className="input select-input"
                    style={{ cursor: "pointer" }}
                  >
                    {brandToneOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <SuggestionRow
                    label="Quick picks"
                    suggestions={brandToneOptions.map((option) => ({
                      label: option,
                      active: form.brandTone === option,
                      onClick: () => setField("brandTone", option),
                    }))}
                  />
                </Field>
              </div>

              <Field
                label="Platforms"
                inputId="platforms"
                helper="Select every channel you want in this campaign pack. You can still retry missing sections later."
                error={shouldShowError("platforms") ? fieldErrors.platforms : undefined}
                suggestionTag={suggestedBy.platforms}
                highlighted={Boolean(highlightedFields.platforms)}
              >
                <div className="platform-grid">
                  {platformOptions.map((platform) => {
                    const selected = form.platforms.includes(platform.key);
                    const PlatformIcon = platformIcon(platform.key);

                    return (
                      <label
                        key={platform.key}
                        className={`platform-card${selected ? " platform-card-active" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => applyPlatformToggle(platform.key)}
                          aria-label={platform.label}
                        />
                        <span className="platform-card-icon">
                          <PlatformIcon style={{ width: "18px", height: "18px" }} aria-hidden="true" />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <span className="platform-card-title">{platform.label}</span>
                          <span className="platform-card-copy">
                            {platform.key === "tiktok-reels" && "Hooks, short-form script, and captions"}
                            {platform.key === "facebook-meta-ads" && "Testable ad variants for paid traffic"}
                            {platform.key === "product-page-copy" && "Hero copy, bullets, and FAQs"}
                            {platform.key === "email-promo" && "Subject lines and full promo email"}
                            {platform.key === "landing-page" && "Above-fold through final CTA"}
                          </span>
                        </div>
                        {selected && (
                          <span className="platform-card-check" aria-hidden="true">
                            <Check style={{ width: "10px", height: "10px", color: "white" }} />
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </Field>
            </>
          )}

          {step === 4 && (
            <div className="review-grid">
              <div className="callout callout-subtle">
                <span className="callout-label">What happens next</span>
                <p className="callout-copy">
                  Strategy builds first, then selected channels generate in parallel, then the pack is saved and opened in results.
                </p>
              </div>

              <ReviewCard
                title="Offer"
                summary={normalized.description}
                meta={[normalized.category, `$${normalized.price}`]}
                rows={[
                  ["Name", normalized.offerName],
                  ["Description", normalized.description],
                ]}
                onEdit={() => goToStep(1)}
              />
              <ReviewCard
                title="Audience"
                summary={normalized.targetAudience}
                meta={[normalized.targetAudience || "Audience needed"]}
                rows={[
                  ["Pain point", normalized.painPoint],
                  ["Benefits", normalized.benefits.filter(Boolean).join(" · ")],
                  ["Social proof", normalized.socialProof || "Not added"],
                ]}
                onEdit={() => goToStep(2)}
              />
              <ReviewCard
                title="Campaign"
                summary={`${normalized.brandTone} tone with ${normalized.primaryCta} as the primary action.`}
                meta={normalized.platforms.map((platform) => PLATFORM_LABELS[platform])}
                rows={[
                  ["Primary CTA", normalized.primaryCta],
                  ["Brand tone", normalized.brandTone],
                  ["Platforms", normalized.platforms.map((platform) => PLATFORM_LABELS[platform]).join(", ")],
                ]}
                onEdit={() => goToStep(3)}
              />
              <div className="callout callout-subtle">
                <span className="callout-label">Brand memory</span>
                <p className="callout-copy">
                  Save this audience, tone, proof, and CTA as a reusable brand profile.
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setBrandSaveName(form.offerName);
                    setBrandSaveError("");
                    setBrandModalOpen(true);
                  }}
                  style={{ marginTop: "12px" }}
                >
                  + Save as brand
                </button>
              </div>
            </div>
          )}
        </div>

        {brandModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-brand-title"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "rgba(15,23,42,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div style={{ width: "100%", maxWidth: "460px", background: "white", borderRadius: "8px", padding: "22px", boxShadow: "0 24px 70px rgba(15,23,42,0.22)" }}>
              <h2 id="save-brand-title" style={{ margin: "0 0 8px", fontSize: "20px" }}>Save Brand Profile</h2>
              <p style={{ margin: "0 0 16px", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                This saves the current audience, tone, proof, and CTA for future campaigns.
              </p>
              <input
                className="input"
                value={brandSaveName}
                onChange={(event) => setBrandSaveName(event.target.value)}
                placeholder="Brand name"
              />
              {brandSaveError && (
                <p role="alert" style={{ margin: "10px 0 0", color: "var(--color-error)", fontSize: "13px" }}>
                  {brandSaveError}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                <button type="button" className="btn-ghost" onClick={() => setBrandModalOpen(false)} disabled={brandSaveBusy}>
                  Cancel
                </button>
                <button type="button" className="btn-primary" onClick={() => void saveCurrentAsBrand()} disabled={brandSaveBusy}>
                  {brandSaveBusy ? "Saving..." : "Save Brand"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loadingState === "strategy" && (
          <div className="card" style={{ marginTop: "24px", borderColor: "#BAE6FD", background: "#F8FCFF" }}>
            <p className="lbl" style={{ marginBottom: "8px" }}>Building your strategy...</p>
            <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
              {STREAM_STAGES.map((stage, index) => {
                const active = streamProgress >= (index === 0 ? 0 : STREAM_STAGES[index - 1].threshold);
                const complete = streamProgress >= stage.threshold;
                return (
                  <div key={stage.label} style={{ display: "flex", alignItems: "center", gap: "8px", color: active ? "#075985" : "#94A3B8", fontSize: "13px", fontWeight: active ? 700 : 500 }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: complete ? "#0EA5E9" : active ? "#7DD3FC" : "#CBD5E1" }} />
                    <span>Stage {index + 1}: {stage.label}</span>
                  </div>
                );
              })}
            </div>
            <pre style={{ margin: 0, minHeight: "140px", maxHeight: "260px", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "white", border: "1px solid #E0F2FE", borderRadius: "8px", padding: "14px", color: "#0F172A", fontSize: "13px", lineHeight: 1.6 }}>
              {streamedText || "Preparing the first strategy tokens..."}
            </pre>
          </div>
        )}

        <div className="card live-preview" style={{ marginTop: "24px" }}>
          <p className="lbl" style={{ marginBottom: "10px" }}>Live Preview</p>
          <div className="live-preview-grid">
            <div>
              <p className="script-block-label">Headline Preview</p>
              <p className="live-preview-copy">{livePreview.headline}</p>
            </div>
            <div>
              <p className="script-block-label">Hook Preview</p>
              <p className="live-preview-copy">{livePreview.hook}</p>
            </div>
            <div>
              <p className="script-block-label">CTA Preview</p>
              <p className="live-preview-copy">{livePreview.cta}</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid var(--color-border-light)" }}>
          <div className="generate-actions">
            <button
              type="button"
              onClick={previousStep}
              disabled={step === 1 || isBusy}
              className="btn-ghost"
              style={{ padding: "8px 0" }}
            >
              ← Back
            </button>

            {step < 4 ? (
              <button type="button" onClick={nextStep} disabled={!canContinue} className="btn-primary">
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isBusy}
                className="btn-primary generate-primary-button"
                style={{ justifyContent: "center" }}
              >
                {isBusy && <span className="spinner" aria-hidden="true" />}
                {isBusy ? loadingMsg : "Generate My Campaign Pack →"}
              </button>
            )}
          </div>

          <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            {isBusy ? loadingMsg : stepReadyText}
          </p>
        </div>
      </main>
    </div>
  );
}

function SuggestionRow({
  label,
  suggestions,
}: {
  label: string;
  suggestions: Array<{ label: string; onClick: () => void; active?: boolean }>;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="suggestion-row">
      <span className="suggestion-row-label">{label}</span>
      <div className="suggestion-chip-wrap">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            className={`suggestion-chip${suggestion.active ? " suggestion-chip-active" : ""}`}
            onClick={suggestion.onClick}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  inputId,
  labelHelper,
  helper,
  footer,
  error,
  optional,
  suggestionTag,
  highlighted,
  children,
}: {
  label: string;
  inputId: string;
  labelHelper?: string;
  helper?: string;
  footer?: string;
  error?: string;
  optional?: boolean;
  suggestionTag?: "ai" | "heuristic";
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`field-stack${highlighted ? " field-stack-highlighted" : ""}`}>
      <div className="field-header">
        <label htmlFor={inputId} className="field-label">
          {label}
          {labelHelper && <span className="label-helper">{labelHelper}</span>}
        </label>
        {optional && <span className="field-badge">Optional</span>}
        {suggestionTag && (
          <span className={`field-suggested field-suggested-${suggestionTag}`}>
            {suggestionTag === "ai" ? "Suggested by AI" : "Suggested"}
          </span>
        )}
      </div>

      {helper && (
        <p id={`${inputId}-helper`} className="field-helper">
          {helper}
        </p>
      )}

      {children}

      {footer && (
        <p id={`${inputId}-footer`} className="field-footer">
          {footer}
        </p>
      )}

      {error && (
        <p id={`${inputId}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ReviewCard({
  title,
  summary,
  meta,
  rows,
  onEdit,
}: {
  title: string;
  summary: string;
  meta: string[];
  rows: [string, string][];
  onEdit: () => void;
}) {
  return (
    <div className="review-card">
      <div className="review-card-header">
        <div>
          <p className="review-card-title">{title}</p>
          <p className="review-card-summary">{summary || "Add details to strengthen this section."}</p>
        </div>
        <button type="button" onClick={onEdit} className="btn-ghost" aria-label={`Edit ${title.toLowerCase()}`}>
          Edit
        </button>
      </div>

      {meta.length > 0 && (
        <div className="review-meta-row">
          {meta.map((item) => (
            <span key={item} className="badge badge-neutral">{item}</span>
          ))}
        </div>
      )}

      <dl className="review-list">
        {rows.map(([key, value]) => (
          <div key={key} className="review-list-row">
            <dt>{key}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
