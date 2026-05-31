"use client";

import { FormEvent, useMemo, useState } from "react";
import { MessageSquareMore } from "lucide-react";

import { normalizeOfferInput } from "@/lib/form";
import { PLATFORM_LABELS } from "@/lib/constants";
import { AssistDraft, OfferFormInput, PlatformKey, StrategyBrief } from "@/lib/types";

type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type ConversationAssistProps = {
  form: OfferFormInput;
  onApplySuggestion: (suggestion: AssistDraft, announce?: string) => void;
  onSwitchToForm: () => void;
};

function buildRequestErrorMessage(fallback: string, payload: unknown) {
  if (!payload || typeof payload !== "object") return fallback;

  const maybeError = (payload as { error?: unknown }).error;
  return typeof maybeError === "string" && maybeError.trim() ? maybeError : fallback;
}

async function fetchJsonWithTimeout<T>(url: string, init: RequestInit, timeoutMs = 30_000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
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
      throw new Error("This took too long. Try again with a shorter message.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
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

function inferCategoryFromText(text: string): OfferFormInput["category"] {
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

function inferPlatforms(category: OfferFormInput["category"]): OfferFormInput["platforms"] {
  if (category === "Service") return ["facebook-meta-ads", "landing-page", "email-promo"];
  if (category === "SaaS") return ["facebook-meta-ads", "landing-page", "email-promo", "product-page-copy"];
  if (category === "Course") return ["tiktok-reels", "facebook-meta-ads", "landing-page", "email-promo"];
  return ["tiktok-reels", "facebook-meta-ads", "product-page-copy"];
}

function inferPrice(category: OfferFormInput["category"], seed: string) {
  const value = seed.toLowerCase();
  if (category === "Service") return value.includes("audit") ? "150" : "250";
  if (category === "SaaS") return value.includes("team") ? "79" : "29";
  if (category === "Course") return "149";
  if (category === "Digital Product") return value.includes("bundle") || value.includes("pack") ? "49" : "29";
  return value.includes("set") || value.includes("bundle") || value.includes("kit") ? "39" : "24";
}

function buildAudienceSuggestion(seed: string, category: OfferFormInput["category"]) {
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
  if (category === "Physical Product") return "Practical shoppers who want a more reliable everyday upgrade";
  if (category === "SaaS") return "Lean teams that need a clearer system without adding more manual work";
  if (category === "Service") return "Founder-led teams that need expert execution without another project to manage";
  if (category === "Digital Product") return "Creators who want a reusable shortcut they can apply quickly";
  if (category === "Course") return "Learners who want a practical path they can follow with confidence";
  return "People who want a clearer, easier option than what they use now";
}

function buildDescriptionSuggestion(offer: string, audience: string, category: OfferFormInput["category"]) {
  const offerText = offer || "This offer";
  const audienceText = audience || "buyers who want a simpler option";

  if (category === "Physical Product") {
    return `${offerText} gives ${audienceText} a more useful, reliable upgrade they will notice in daily use.`;
  }

  if (category === "SaaS") {
    return `${offerText} helps ${audienceText} replace a messy workflow with a clearer, more repeatable system.`;
  }

  if (category === "Service") {
    return `${offerText} helps ${audienceText} get important work handled properly without more internal coordination.`;
  }

  if (category === "Digital Product") {
    return `${offerText} helps ${audienceText} skip the blank-page phase and get to a usable result faster.`;
  }

  if (category === "Course") {
    return `${offerText} helps ${audienceText} build confidence through a practical path they can apply step by step.`;
  }

  return `${offerText} helps ${audienceText} move from the current friction to a clearer, easier next step.`;
}

function buildPainPointSuggestion(audience: string, category: OfferFormInput["category"]) {
  if (!audience.trim()) return "They are tired of piecing together a solution that should feel simpler.";

  if (category === "SaaS") {
    return `${audience.trim()} are stuck with manual steps, scattered context, or slow handoffs that make the team less consistent.`;
  }

  if (category === "Service") {
    return `${audience.trim()} know the work matters, but it keeps slipping because nobody has the time or specialist focus to own it.`;
  }

  if (category === "Physical Product") {
    return `${audience.trim()} are tired of products that look promising online but feel flimsy, overhyped, or forgettable in daily use.`;
  }

  return `${audience.trim()} are tired of wasting time on awkward workarounds and want a simpler, more reliable option.`;
}

function buildBenefitSuggestions(seed: string, category: OfferFormInput["category"]): [string, string, string] {
  const parsed = parseIdeaSeed(seed);
  const base = parsed.offer || seed.trim() || "This offer";

  if (category === "SaaS") {
    return [
      `${base} makes the workflow easier to track and improve`,
      `${base} reduces repetitive work before it slows the team down`,
      `${base} helps the team stay consistent as volume grows`,
    ].map((item) => item.length > 90 ? "Makes the workflow clearer and easier to act on" : item) as [string, string, string];
  }

  if (category === "Service") {
    return [
      `${base} gives the buyer expert execution without extra coordination`,
      `${base} turns a stalled project into a clear deliverable`,
      `${base} creates momentum faster than hiring or managing from scratch`,
    ].map((item) => item.length > 90 ? "Turns an important project into a clearer deliverable" : item) as [string, string, string];
  }

  if (category === "Physical Product") {
    return [
      `${base} feels useful and credible from the first use`,
      `${base} gives buyers a practical reason to choose it over a cheaper substitute`,
      `${base} makes the purchase feel worth repeating instead of instantly replaceable`,
    ].map((item) => item.length > 90 ? "Makes the product feel more useful and easier to trust" : item) as [string, string, string];
  }

  return [
    `${base} gives the buyer a clearer result they can understand quickly`,
    `${base} reduces wasted time, second-guessing, or repeat effort`,
    `${base} makes the decision feel easier to trust and act on`,
  ].map((item) => item.length > 90 ? "Makes the result feel clearer and easier to act on" : item) as [string, string, string];
}

function inferCtaFromBenefits(benefits: [string, string, string], category: OfferFormInput["category"]): OfferFormInput["primaryCta"] {
  const text = benefits.join(" ").toLowerCase();
  if (text.includes("call") || text.includes("team") || category === "Service") return "Book a Call";
  if (text.includes("trial") || text.includes("signup") || category === "SaaS") return "Sign Up";
  if (text.includes("download") || category === "Digital Product" || category === "Course") return "Download";
  if (text.includes("buy") || category === "Physical Product") return "Buy Now";
  return "Learn More";
}

function extractPrice(text: string) {
  const match = text.match(/\$?\s*(\d{1,4})(?:\.\d{1,2})?/);
  return match ? match[1] : "";
}

function mapBestChannelsToPlatforms(bestChannels: string[], fallback: OfferFormInput["platforms"]) {
  const mapped = bestChannels.reduce<PlatformKey[]>((acc, channel) => {
    const value = channel.toLowerCase();

    if ((value.includes("tiktok") || value.includes("reels")) && !acc.includes("tiktok-reels")) acc.push("tiktok-reels");
    if ((value.includes("facebook") || value.includes("meta") || value.includes("paid social")) && !acc.includes("facebook-meta-ads")) acc.push("facebook-meta-ads");
    if ((value.includes("product page") || value.includes("shopify")) && !acc.includes("product-page-copy")) acc.push("product-page-copy");
    if (value.includes("email") && !acc.includes("email-promo")) acc.push("email-promo");
    if (value.includes("landing") && !acc.includes("landing-page")) acc.push("landing-page");

    return acc;
  }, []);

  return mapped.length > 0 ? mapped : fallback;
}

function buildCandidateForm(form: OfferFormInput, userInput: string): OfferFormInput {
  const seed = userInput.trim();
  const parsed = parseIdeaSeed(seed);
  const inferredCategory = form.offerName.trim() || form.description.trim() ? form.category : inferCategoryFromText(seed);
  const audience = parsed.audience
    ? buildAudienceSuggestion(seed, inferredCategory)
    : form.targetAudience.trim() || buildAudienceSuggestion(seed, inferredCategory);
  const benefits = form.benefits.every((benefit) => benefit.trim())
    ? form.benefits
    : buildBenefitSuggestions(seed || form.painPoint || form.offerName, inferredCategory);
  const offerName = form.offerName.trim() || toTitleCase(parsed.offer || seed.split(" ").slice(0, 5).join(" "));

  return {
    offerName,
    category: inferredCategory,
    price: extractPrice(seed) || form.price.trim() || inferPrice(inferredCategory, seed || offerName),
    description: form.description.trim() || buildDescriptionSuggestion(parsed.offer || offerName, audience, inferredCategory),
    targetAudience: audience,
    painPoint: form.painPoint.trim() || buildPainPointSuggestion(audience, inferredCategory),
    benefits,
    socialProof: form.socialProof.trim(),
    primaryCta: form.primaryCta === "Buy Now" ? inferCtaFromBenefits(benefits, inferredCategory) : form.primaryCta,
    brandTone: form.brandTone === "Professional" ? inferToneFromText(seed) : form.brandTone,
    platforms: form.platforms.length > 0 ? form.platforms : inferPlatforms(inferredCategory),
  };
}

function buildFollowUpQuestion(form: OfferFormInput, strategyBrief: StrategyBrief, suggestedPrice: string) {
  const audience = form.targetAudience.trim().toLowerCase();

  if (!form.targetAudience.trim() || audience.includes("people who") || audience.includes("buyers who")) {
    return "Who is this for most specifically?";
  }

  if (!form.price.trim()) {
    return `Would you position this closer to budget, mid-tier, or premium around $${suggestedPrice}?`;
  }

  if (form.primaryCta === "Learn More" || strategyBrief.recommendedCTA === "Learn More") {
    return "What makes the offer strong enough to act on now?";
  }

  return "What gives this offer urgency or a stronger reason to act now?";
}

function buildAssistantReply(form: OfferFormInput, suggestion: AssistDraft, strategyBrief: StrategyBrief) {
  const audience = suggestion.targetAudience || form.targetAudience;
  const platformSummary = (suggestion.platforms || []).slice(0, 2).map((platform) => PLATFORM_LABELS[platform]).join(" + ");
  const firstSentence = audience
    ? `This draft is aimed at ${audience.toLowerCase()}.`
    : "This is a tighter first-pass campaign direction.";
  const secondSentence = platformSummary
    ? `Best starting channels look like ${platformSummary}.`
    : "The campaign direction is tightened and ready to edit.";
  const followUp = buildFollowUpQuestion(form, strategyBrief, suggestion.price || form.price || "49");

  return `${firstSentence} ${secondSentence} ${followUp}`;
}

export function ConversationAssist({ form, onApplySuggestion, onSwitchToForm }: ConversationAssistProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: "intro",
      role: "assistant",
      text: "Describe the offer in one sentence. I’ll draft the form, then ask only the next useful question.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partialUpdates, setPartialUpdates] = useState<string[]>([]);

  const messageCountLabel = useMemo(() => `${messages.length} messages`, [messages.length]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = input.trim();
    if (!value || isTyping) return;

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: value,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsTyping(true);

    const candidate = buildCandidateForm(form, value);

    try {
      const strategyPayload = await fetchJsonWithTimeout<{ strategyBrief: StrategyBrief }>(
        "/api/strategy",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerData: normalizeOfferInput(candidate) }),
        },
      );

      const suggestion: AssistDraft = {
        offerName: candidate.offerName,
        category: candidate.category,
        price: candidate.price,
        description: candidate.description,
        targetAudience: candidate.targetAudience,
        painPoint: candidate.painPoint,
        benefits: candidate.benefits,
        primaryCta: strategyPayload.strategyBrief.recommendedCTA as OfferFormInput["primaryCta"],
        brandTone: candidate.brandTone,
        platforms: mapBestChannelsToPlatforms(strategyPayload.strategyBrief.bestChannels, candidate.platforms),
      };

      onApplySuggestion(suggestion, "Conversation draft added to the form. Edit anything before generating.");

      const updatedFields = [
        suggestion.offerName ? "offer" : "",
        suggestion.targetAudience ? "audience" : "",
        suggestion.price ? "price" : "",
        suggestion.primaryCta ? "CTA" : "",
      ].filter(Boolean);

      setPartialUpdates(updatedFields);

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: buildAssistantReply(form, suggestion, strategyPayload.strategyBrief),
        },
      ]);
    } catch (error) {
      const fallbackText = error instanceof Error
        ? error.message
        : "I could not tighten the draft yet. Try a slightly more specific offer sentence and run it again.";

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: fallbackText,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <section className="conversation-panel" aria-label="Conversational campaign mode">
      <div className="conversation-panel-header">
        <div>
          <p className="conversation-panel-kicker">
            <MessageSquareMore style={{ width: "14px", height: "14px" }} aria-hidden="true" />
            Conversational Campaign Mode
          </p>
          <p className="conversation-panel-copy">
            Talk through the offer naturally. The form updates in the background and stays editable.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onSwitchToForm}>
          Switch to Form
        </button>
      </div>

      <div className="conversation-thread" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`conversation-row conversation-row-${message.role}`}
          >
            <div className={`conversation-bubble conversation-bubble-${message.role}`}>
              {message.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="conversation-row conversation-row-assistant">
            <div className="conversation-bubble conversation-bubble-assistant">
              <span className="conversation-typing">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      <div className="conversation-footer">
        <div className="conversation-meta">
          <span>{messageCountLabel}</span>
          {partialUpdates.length > 0 && <span>Updated: {partialUpdates.join(", ")}</span>}
        </div>

        <form onSubmit={handleSubmit} className="conversation-form">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="input"
            placeholder="e.g. bamboo toothbrush for eco people at $24"
            aria-label="Describe your campaign idea"
          />
          <button type="submit" className="btn-primary" disabled={isTyping}>
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
