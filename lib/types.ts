export const categoryOptions = [
  "Physical Product",
  "Digital Product",
  "Service",
  "SaaS",
  "Course",
] as const;

export const primaryCtaOptions = [
  "Buy Now",
  "Book a Call",
  "Download",
  "Sign Up",
  "Learn More",
] as const;

export const brandToneOptions = [
  "Professional",
  "Casual",
  "Bold",
  "Empathetic",
  "Urgent",
  "Playful",
] as const;

export const platformOptions = [
  { key: "tiktok-reels", label: "TikTok/Reels" },
  { key: "facebook-meta-ads", label: "Facebook/Meta Ads" },
  { key: "product-page-copy", label: "Product Page Copy" },
  { key: "email-promo", label: "Email Promo" },
  { key: "landing-page", label: "Landing Page" },
  { key: "video-concepts", label: "Video Concepts", description: "Scripts, scenes, shot lists" },
  { key: "content-calendar", label: "30-Day Calendar", description: "Full month of content planned" },
  { key: "creative-prompts", label: "Creative Prompts", description: "Image and video AI prompts" },
] as const;

export type OfferCategory = (typeof categoryOptions)[number];
export type PrimaryCta = (typeof primaryCtaOptions)[number];
export type BrandTone = (typeof brandToneOptions)[number];
export type PlatformKey = (typeof platformOptions)[number]["key"];
export type AudienceAwarenessLevel =
  | "problem-aware"
  | "solution-aware"
  | "product-aware";

export interface OfferFormInput {
  sourceUrl?: string;
  inputType: "manual" | "url" | "description";
  offerName: string;
  category: OfferCategory;
  price: string;
  description: string;
  targetAudience: string;
  painPoint: string;
  benefits: [string, string, string];
  socialProof: string;
  primaryCta: PrimaryCta;
  brandTone: BrandTone;
  platforms: PlatformKey[];
}

export interface OfferFormData {
  sourceUrl?: string;
  inputType: "manual" | "url" | "description";
  offerName: string;
  category: OfferCategory;
  price: number;
  description: string;
  targetAudience: string;
  painPoint: string;
  benefits: [string, string, string];
  socialProof: string;
  primaryCta: PrimaryCta;
  brandTone: BrandTone;
  platforms: PlatformKey[];
}

export interface StrategyAngle {
  angle: string;
  rationale: string;
  bestFor: string;
}

export interface StrategyBrief {
  positioningSummary: string;
  topAngles: [StrategyAngle, StrategyAngle, StrategyAngle];
  primaryEmotionalHook: string;
  topObjections: [string, string, string];
  recommendedCTA: string;
  bestChannels: string[];
  audienceAwarenessLevel: AudienceAwarenessLevel;
  contentPriority: string;
}

export interface TikTokContent {
  hooks: { hook: string; type: string }[];
  script: {
    hook: string;
    problem: string;
    solution: string;
    proof: string;
    cta: string;
    onScreenText: string[];
    totalDuration: string;
  };
  captionVariants: string[];
}

export interface FacebookAdsContent {
  variants: {
    headline: string;
    primaryText: { short: string; medium: string; long: string };
    description: string;
    ctaButton: string;
  }[];
}

export interface ProductPageContent {
  heroHeadline: string;
  heroSubheadline: string;
  benefitBullets: string[];
  socialProofPlacement: string;
  faqItems: { question: string; answer: string }[];
}

export interface EmailContent {
  subjectLines: { subject: string; previewText: string }[];
  body: {
    opening: string;
    problem: string;
    solution: string;
    offer: string;
    cta: string;
    ps: string;
  };
}

export interface LandingPageContent {
  aboveFold: { headline: string; subheadline: string; cta: string };
  problemSection: { headline: string; body: string };
  solutionSection: { headline: string; body: string };
  proofSection: { headline: string; points: string[] };
  offerStack: { headline: string; items: string[] };
  finalCta: { headline: string; button: string; urgency: string };
}

export interface VideoConceptsContent {
  concepts: {
    title: string;
    platform: "TikTok" | "YouTube Shorts" | "Instagram Reels";
    hook: string;
    structure: string[];
    script: string;
    brollSuggestions: string[];
    onScreenText: string[];
    voiceover: string;
    cta: string;
    estimatedDuration: string;
    faceless: boolean;
  }[];
}

export interface ContentCalendarContent {
  calendar: {
    day: number;
    date: string;
    platform: string;
    contentType: string;
    hook: string;
    format: string;
    notes: string;
    hashtags: string[];
  }[];
}

export interface CreativePromptsContent {
  imagePrompts: {
    purpose: string;
    prompt: string;
    negativePrompt: string;
    dimensions: string;
    style: string;
  }[];
  videoPrompts: {
    purpose: string;
    prompt: string;
    duration: string;
    style: string;
  }[];
  thumbnailPrompts: {
    purpose: string;
    prompt: string;
  }[];
}

export interface GeneratedContent {
  "tiktok-reels"?: TikTokContent;
  "facebook-meta-ads"?: FacebookAdsContent;
  "product-page-copy"?: ProductPageContent;
  "email-promo"?: EmailContent;
  "landing-page"?: LandingPageContent;
  "video-concepts"?: VideoConceptsContent;
  "content-calendar"?: ContentCalendarContent;
  "creative-prompts"?: CreativePromptsContent;
}

export interface GenerationIssue {
  platform: PlatformKey;
  message: string;
}

export interface CommerceMetric {
  key:
    | "offerClarity"
    | "hookStrength"
    | "audienceFit"
    | "buyingIntent"
    | "channelMatch";
  label: string;
  score: number;
  reason: string;
}

export interface CommerceScores {
  overall: number;
  status: "red" | "amber" | "green";
  metrics: CommerceMetric[];
}

export interface CampaignAnalysisBreakdown {
  clarity: number;
  urgency: number;
  differentiation: number;
  trust: number;
}

export interface CampaignAnalysis {
  score: number;
  breakdown: CampaignAnalysisBreakdown;
  suggestions: string[];
}

export interface CampaignRecord {
  id: string;
  user_id: string | null;
  title: string;
  offer_data: OfferFormData;
  strategy_brief: StrategyBrief;
  generated_content: GeneratedContent;
  commerce_scores: CommerceScores;
  created_at: string;
}

export interface StrategyRequestBody {
  offerData: OfferFormData;
}

export interface GenerateRequestBody {
  offerData: OfferFormData;
  strategyBrief: StrategyBrief;
  platforms: PlatformKey[];
}

export interface GenerateResponseBody {
  generatedContent: GeneratedContent;
  failedPlatforms: GenerationIssue[];
}

export interface AssistDraft {
  offerName?: string;
  category?: OfferCategory;
  price?: string;
  description?: string;
  targetAudience?: string;
  painPoint?: string;
  benefits?: [string, string, string];
  socialProof?: string;
  primaryCta?: PrimaryCta;
  brandTone?: BrandTone;
  platforms?: PlatformKey[];
}

export interface AssistRequestBody {
  mode: "draft" | "full";
  idea?: string;
  offerData: Partial<OfferFormInput>;
}

export interface AssistResponseBody {
  suggestion: AssistDraft;
  source: "ai" | "heuristic";
}

export interface ProductIdea {
  id: string;
  productName: string;
  category: OfferCategory;
  targetAudience: string;
  hookIdea: string;
  estimatedPrice: string;
  description: string;
  painPoint: string;
  benefits: [string, string, string];
  socialProof: string;
  primaryCta: PrimaryCta;
  brandTone: BrandTone;
  platforms: PlatformKey[];
}

export interface ProductIdeasResponseBody {
  ideas: ProductIdea[];
  source: "ai" | "heuristic";
}

export interface SaveCampaignRequestBody {
  campaignId?: string;
  offerData: OfferFormData;
  strategyBrief: StrategyBrief;
  generatedContent: GeneratedContent;
  commerceScores: CommerceScores;
}
