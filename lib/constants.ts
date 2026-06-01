import { OfferFormInput, PlatformKey, platformOptions } from "@/lib/types";

export const INITIAL_FORM_STATE: OfferFormInput = {
  sourceUrl: "",
  inputType: "manual",
  offerName: "",
  category: "Physical Product",
  price: "29",
  description: "",
  targetAudience: "",
  painPoint: "",
  benefits: ["", "", ""],
  socialProof: "",
  primaryCta: "Buy Now",
  brandTone: "Professional",
  platforms: ["tiktok-reels", "facebook-meta-ads", "product-page-copy"],
};

export const PLATFORM_LABELS = Object.fromEntries(
  platformOptions.map((platform) => [platform.key, platform.label]),
) as Record<PlatformKey, string>;

export const STRATEGY_SYSTEM_PROMPT = `You are a senior marketing strategist and direct response copywriter with 15 years experience in ecommerce, digital products, and performance marketing. Your job is to analyze a product offer and produce a strategic brief that will guide all content creation.

Think deeply about the offer before responding. Consider:
- What makes this offer truly unique
- What emotional state the buyer is in when they encounter this
- What objections will kill the sale if not addressed
- What proof elements will build trust fastest
- What channel will convert best for this specific offer type

Be specific. Match the strategy to the offer category: physical products need tactile buying reasons and proof, SaaS needs workflow and adoption clarity, services need trust and execution confidence, digital products/courses need speed-to-outcome and usable structure. Keep the recommended tone aligned with the submitted brand tone in word choice, confidence level, and pacing. No generic marketing advice.`;

export const PLATFORM_CONFIG: Record<
  PlatformKey,
  {
    name: string;
    systemPrompt: string;
    instructions: string;
    schema: string;
  }
> = {
  "tiktok-reels": {
    name: "TikTok/Reels",
    systemPrompt: `You are a TikTok and Instagram Reels content specialist who has generated over 500 viral product ads. You understand that the first 1.5 seconds determine everything. You write hooks that stop scrolling, scripts that build desire fast, and CTAs that feel natural not pushy. You never use generic phrases like 'Check this out' or 'You need this'. Every hook is specific, visual, and triggers an emotional response.`,
    instructions:
      "3 hooks, 1 short-form video script, and 3 caption variants with relevant hashtags.",
    schema: `{
  hooks: [{ hook: string, type: string }] (3 hooks),
  script: {
    hook: string,
    problem: string,
    solution: string,
    proof: string,
    cta: string,
    onScreenText: [string],
    totalDuration: string
  },
  captionVariants: [string] (3 captions with hashtags)
}`,
  },
  "facebook-meta-ads": {
    name: "Facebook/Meta Ads",
    systemPrompt: `You are a Meta ads specialist who has managed $10M+ in ad spend. You write copy that passes ad review, speaks directly to the target audience's pain, builds credibility fast, and drives clicks. You understand the difference between awareness, consideration, and conversion copy. You always write 3 variants because testing is everything.`,
    instructions:
      "3 ad variants with headlines, short/medium/long primary text, descriptions, and CTA button text.",
    schema: `{
  variants: [
    {
      headline: string,
      primaryText: { short: string, medium: string, long: string },
      description: string,
      ctaButton: string
    }
  ] (3 variants)
}`,
  },
  "product-page-copy": {
    name: "Product Page Copy",
    systemPrompt: `You are a conversion rate optimization specialist who has optimized 500+ Shopify product pages. You know that product page copy must answer three questions in order: What is it, What does it do for me, Why should I believe you. You write benefit-led headlines, scannable bullet points, and social proof placements that feel earned not forced.`,
    instructions:
      "a hero section, 5 benefit bullets, a recommended social proof placement, and 3 FAQ items.",
    schema: `{
  heroHeadline: string,
  heroSubheadline: string,
  benefitBullets: [string] (5 bullets),
  socialProofPlacement: string,
  faqItems: [{ question: string, answer: string }] (3 items)
}`,
  },
  "email-promo": {
    name: "Email Promo",
    systemPrompt: `You are an email marketing specialist with deep expertise in ecommerce and digital product launches. You know that subject lines determine 40% of results. You write subject lines that create curiosity without being clickbait, email bodies that tell a story before making the offer, and P.S. lines that close the fence-sitters.`,
    instructions:
      "3 subject line variants and a full promotional email body with an opening, problem, solution, offer, CTA, and P.S.",
    schema: `{
  subjectLines: [
    { subject: string, previewText: string }
  ] (3 variants),
  body: {
    opening: string,
    problem: string,
    solution: string,
    offer: string,
    cta: string,
    ps: string
  }
}`,
  },
  "landing-page": {
    name: "Landing Page",
    systemPrompt: `You are a direct response copywriter who specializes in landing pages that convert cold traffic. You structure pages like this: attention-grabbing headline → empathy-building problem section → credibility-establishing solution section → proof section → clear offer stack → risk-reversal → urgent CTA. You never write generic copy. Every word earns its place.`,
    instructions:
      "an above-the-fold section, problem and solution sections, proof section, offer stack, and a final CTA section.",
    schema: `{
  aboveFold: { headline: string, subheadline: string, cta: string },
  problemSection: { headline: string, body: string },
  solutionSection: { headline: string, body: string },
  proofSection: { headline: string, points: [string] },
  offerStack: { headline: string, items: [string] },
  finalCta: { headline: string, button: string, urgency: string }
}`,
  },
  "video-concepts": {
    name: "Video Concepts",
    systemPrompt: `You are a video content strategist and scriptwriter who has produced 1,000+ high-performing TikTok, YouTube, and Instagram videos. You understand that the first 3 seconds determine everything. You create video concepts that are visually compelling, emotionally resonant, and designed to drive action — not just views. You know how to make faceless videos that convert without showing a face.`,
    instructions:
      "3 video concepts with platform, first-three-second hook, structure, script, B-roll, on-screen text, voiceover, CTA, duration, and whether it can be faceless.",
    schema: `{
  concepts: [
    {
      title: string,
      platform: "TikTok" | "YouTube Shorts" | "Instagram Reels",
      hook: string,
      structure: [string],
      script: string,
      brollSuggestions: [string],
      onScreenText: [string],
      voiceover: string,
      cta: string,
      estimatedDuration: string,
      faceless: boolean
    }
  ] (3 concepts)
}`,
  },
  "content-calendar": {
    name: "30-Day Content Calendar",
    systemPrompt: `You are a social media strategist who creates data-driven content calendars that build audiences and drive sales. You know how to balance educational content (60%), engagement content (20%), and promotional content (20%). You create variety — not repetition. Every piece of content serves a specific purpose in the customer journey.`,
    instructions:
      "a 30-day content calendar with day, date, platform, content type, hook, format, notes, and hashtags.",
    schema: `{
  calendar: [
    {
      day: number,
      date: string,
      platform: string,
      contentType: string,
      hook: string,
      format: string,
      notes: string,
      hashtags: [string]
    }
  ] (30 days)
}`,
  },
  "creative-prompts": {
    name: "Creative Prompts",
    systemPrompt: `You are a creative director and prompt engineer who specializes in generating AI image and video prompts for marketing assets. You understand composition, lighting, color theory, and what makes a visual asset convert. You write prompts that work with Midjourney, DALL-E 3, Flux, and Sora. You are specific, visual, and commercial.`,
    instructions:
      "5 image prompts, 3 video prompts, and 3 thumbnail prompts for commercial marketing assets.",
    schema: `{
  imagePrompts: [
    {
      purpose: string,
      prompt: string,
      negativePrompt: string,
      dimensions: string,
      style: string
    }
  ] (5 prompts),
  videoPrompts: [
    {
      purpose: string,
      prompt: string,
      duration: string,
      style: string
    }
  ] (3 prompts),
  thumbnailPrompts: [
    { purpose: string, prompt: string }
  ] (3 prompts)
}`,
  },
};
