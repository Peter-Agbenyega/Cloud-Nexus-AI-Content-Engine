"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Download, Loader2, RefreshCcw, Save } from "lucide-react";

import { analyzeCampaign } from "@/lib/analysis";
import {
  exportAsContentCalendar,
  exportAsMetaAds,
  exportAsPDF,
  exportAsText,
  getExportFilename,
} from "@/lib/export";
import { calculateCommerceScores } from "@/lib/commerce-score";
import { PLATFORM_LABELS } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  CampaignAnalysis,
  ContentCalendarContent,
  CreativePromptsContent,
  CampaignRecord,
  EmailContent,
  FacebookAdsContent,
  GenerateResponseBody,
  LandingPageContent,
  PlatformKey,
  ProductPageContent,
  SaveCampaignRequestBody,
  StrategyBrief,
  TikTokContent,
  VideoConceptsContent,
} from "@/lib/types";

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role={t.type === "error" ? "alert" : "status"}>{t.message}</div>
      ))}
    </div>
  );
}

// ─── Content card ─────────────────────────────────────────────────────────────

const ContentCard = memo(function ContentCard({
  title,
  copyText,
  onCopy,
  copyState,
  children,
}: {
  title: string;
  copyText: string;
  onCopy: (label: string, value: string) => void;
  copyState: string | null;
  children: React.ReactNode;
}) {
  const copied = copyState === title;
  return (
    <div className="content-card">
      <div className="content-card-header">
        <span className="lbl">{title}</span>
        <button
          type="button"
          className={`copy-btn${copied ? " copied" : ""}`}
          onClick={() => void onCopy(title, copyText)}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <div className="content-card-body">{children}</div>
    </div>
  );
});

// ─── Platform renderers ───────────────────────────────────────────────────────

const TikTokRenderer = memo(function TikTokRenderer({
  data, onCopy, copyState,
}: { data: TikTokContent; onCopy: (l: string, v: string) => void; copyState: string | null }) {
  const hooksText = data.hooks
    .map((h, i) => `${i + 1}. [${h.type}]\n${h.hook}`)
    .join("\n\n");

  const scriptText = [
    `HOOK\n${data.script.hook}`,
    `PROBLEM\n${data.script.problem}`,
    `SOLUTION\n${data.script.solution}`,
    `PROOF\n${data.script.proof}`,
    `CTA\n${data.script.cta}`,
    data.script.onScreenText.length
      ? `ON-SCREEN TEXT\n${data.script.onScreenText.join(" / ")}`
      : null,
    `DURATION: ${data.script.totalDuration}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const captionsText = data.captionVariants
    .map((c, i) => `Variant ${i + 1}:\n${c}`)
    .join("\n\n---\n\n");

  return (
    <>
      <ContentCard title="Hooks" copyText={hooksText} onCopy={onCopy} copyState={copyState}>
        {data.hooks.map((hook, i) => (
          <div key={i} className="hook-item">
            <span className="hook-num">{i + 1}</span>
            <div>
              <span className="badge badge-blue" style={{ marginBottom: "5px", display: "inline-block" }}>{hook.type}</span>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.65, color: "#374151" }}>{hook.hook}</p>
            </div>
          </div>
        ))}
      </ContentCard>

      <ContentCard title="Video Script" copyText={scriptText} onCopy={onCopy} copyState={copyState}>
        {[
          { label: "Hook", value: data.script.hook },
          { label: "Problem", value: data.script.problem },
          { label: "Solution", value: data.script.solution },
          { label: "Proof", value: data.script.proof },
          { label: "CTA", value: data.script.cta },
        ].map(({ label, value }) => (
          <div key={label} className="script-block">
            <p className="script-block-label">{label}</p>
            <p className="script-block-text">{value}</p>
          </div>
        ))}
        {data.script.onScreenText.length > 0 && (
          <div className="script-block">
            <p className="script-block-label">On-Screen Text</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {data.script.onScreenText.map((t, i) => (
                <span key={i} className="badge badge-neutral">{t}</span>
              ))}
            </div>
          </div>
        )}
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "10px 0 0" }}>
          Estimated duration: {data.script.totalDuration}
        </p>
      </ContentCard>

      <ContentCard title="Caption Variants" copyText={captionsText} onCopy={onCopy} copyState={copyState}>
        {data.captionVariants.map((cap, i) => (
          <div key={i} style={{
            padding: "10px 0",
            borderBottom: i < data.captionVariants.length - 1 ? "1px solid #f9fafb" : "none",
          }}>
            <span className="lbl" style={{ marginBottom: "6px", display: "block" }}>Variant {i + 1}</span>
            <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#374151", margin: 0, whiteSpace: "pre-wrap" }}>{cap}</p>
          </div>
        ))}
      </ContentCard>
    </>
  );
});

const FacebookRenderer = memo(function FacebookRenderer({
  data, onCopy, copyState,
}: { data: FacebookAdsContent; onCopy: (l: string, v: string) => void; copyState: string | null }) {
  return (
    <>
      {data.variants.map((variant, i) => {
        const copyText = [
          `HEADLINE\n${variant.headline}`,
          `SHORT TEXT\n${variant.primaryText.short}`,
          `MEDIUM TEXT\n${variant.primaryText.medium}`,
          `LONG TEXT\n${variant.primaryText.long}`,
          `DESCRIPTION\n${variant.description}`,
          `CTA BUTTON: ${variant.ctaButton}`,
        ].join("\n\n");

        return (
          <ContentCard
            key={i}
            title={`Ad Variant ${i + 1}`}
            copyText={copyText}
            onCopy={onCopy}
            copyState={copyState}
          >
            {/* Headline */}
            <div className="script-block">
              <p className="script-block-label">Headline</p>
              <p style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: 0 }}>
                {variant.headline}
              </p>
            </div>

            {/* Primary text variants */}
            {[
              { label: "Short Text", value: variant.primaryText.short },
              { label: "Medium Text", value: variant.primaryText.medium },
              { label: "Long Text", value: variant.primaryText.long },
            ].map(({ label, value }) => (
              <div key={label} className="script-block">
                <p className="script-block-label">{label}</p>
                <p className="script-block-text">{value}</p>
              </div>
            ))}

            {/* Description + CTA row */}
            <div className="script-block">
              <p className="script-block-label">Description</p>
              <p className="script-block-text">{variant.description}</p>
            </div>
            <div style={{ marginTop: "10px" }}>
              <span className="lbl" style={{ marginRight: "8px" }}>CTA Button</span>
              <span className="badge badge-blue">{variant.ctaButton}</span>
            </div>
          </ContentCard>
        );
      })}
    </>
  );
});

const ProductPageRenderer = memo(function ProductPageRenderer({
  data, onCopy, copyState,
}: { data: ProductPageContent; onCopy: (l: string, v: string) => void; copyState: string | null }) {
  const heroCopy = `${data.heroHeadline}\n${data.heroSubheadline}`;
  const bulletsCopy = data.benefitBullets.map((b, i) => `${i + 1}. ${b}`).join("\n");
  const faqCopy = data.faqItems
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  return (
    <>
      {/* Hero */}
      <ContentCard title="Hero Section" copyText={heroCopy} onCopy={onCopy} copyState={copyState}>
        <div style={{
          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
          borderRadius: "8px",
          padding: "18px 20px",
        }}>
          <p style={{ fontSize: "20px", fontWeight: 700, color: "#111827", margin: "0 0 6px", lineHeight: 1.25 }}>
            {data.heroHeadline}
          </p>
          <p style={{ fontSize: "15px", color: "#374151", margin: 0, lineHeight: 1.6 }}>
            {data.heroSubheadline}
          </p>
        </div>
      </ContentCard>

      {/* Benefits */}
      <ContentCard title="Benefit Bullets" copyText={bulletsCopy} onCopy={onCopy} copyState={copyState}>
        {data.benefitBullets.map((bullet, i) => (
          <div key={i} className="proof-item">
            <span className="proof-dot" />
            <span>{bullet}</span>
          </div>
        ))}
      </ContentCard>

      {/* Social proof */}
      <ContentCard title="Social Proof Placement" copyText={data.socialProofPlacement} onCopy={onCopy} copyState={copyState}>
        <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.65, margin: 0 }}>
          {data.socialProofPlacement}
        </p>
      </ContentCard>

      {/* FAQs */}
      <ContentCard title="FAQ Items" copyText={faqCopy} onCopy={onCopy} copyState={copyState}>
        {data.faqItems.map((item, i) => (
          <div key={i} className="faq-item">
            <p className="faq-question">Q: {item.question}</p>
            <p className="faq-answer">{item.answer}</p>
          </div>
        ))}
      </ContentCard>
    </>
  );
});

const EmailRenderer = memo(function EmailRenderer({
  data, onCopy, copyState,
}: { data: EmailContent; onCopy: (l: string, v: string) => void; copyState: string | null }) {
  const subjectsCopy = data.subjectLines
    .map((s, i) => `Subject ${i + 1}: ${s.subject}\nPreview: ${s.previewText}`)
    .join("\n\n");

  const bodyCopy = [
    `OPENING\n${data.body.opening}`,
    `PROBLEM\n${data.body.problem}`,
    `SOLUTION\n${data.body.solution}`,
    `OFFER\n${data.body.offer}`,
    `CTA\n${data.body.cta}`,
    `P.S.\n${data.body.ps}`,
  ].join("\n\n");

  return (
    <>
      {/* Subject lines */}
      <ContentCard title="Subject Lines" copyText={subjectsCopy} onCopy={onCopy} copyState={copyState}>
        {data.subjectLines.map((line, i) => (
          <div key={i} style={{
            padding: "10px 12px",
            borderRadius: "8px",
            background: "#fafbfc",
            border: "1px solid #f3f4f6",
            marginBottom: i < data.subjectLines.length - 1 ? "8px" : 0,
          }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: "0 0 3px" }}>
              {line.subject}
            </p>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
              Preview: {line.previewText}
            </p>
          </div>
        ))}
      </ContentCard>

      {/* Email body */}
      <ContentCard title="Email Body" copyText={bodyCopy} onCopy={onCopy} copyState={copyState}>
        {[
          { label: "Opening", value: data.body.opening },
          { label: "Problem", value: data.body.problem },
          { label: "Solution", value: data.body.solution },
          { label: "Offer", value: data.body.offer },
          { label: "CTA", value: data.body.cta },
          { label: "P.S.", value: data.body.ps },
        ].map(({ label, value }) => (
          <div key={label} className="script-block">
            <p className="script-block-label">{label}</p>
            <p className="script-block-text">{value}</p>
          </div>
        ))}
      </ContentCard>
    </>
  );
});

const LandingPageRenderer = memo(function LandingPageRenderer({
  data, onCopy, copyState,
}: { data: LandingPageContent; onCopy: (l: string, v: string) => void; copyState: string | null }) {
  const aboveFoldCopy = `HEADLINE: ${data.aboveFold.headline}\nSUBHEADLINE: ${data.aboveFold.subheadline}\nCTA: ${data.aboveFold.cta}`;
  const problemCopy = `${data.problemSection.headline}\n\n${data.problemSection.body}`;
  const solutionCopy = `${data.solutionSection.headline}\n\n${data.solutionSection.body}`;
  const proofCopy = `${data.proofSection.headline}\n\n${data.proofSection.points.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
  const offerCopy = `${data.offerStack.headline}\n\n${data.offerStack.items.map((item, i) => `${i + 1}. ${item}`).join("\n")}`;
  const ctaCopy = `${data.finalCta.headline}\nButton: ${data.finalCta.button}\nUrgency: ${data.finalCta.urgency}`;

  return (
    <>
      {/* Above fold */}
      <ContentCard title="Above the Fold" copyText={aboveFoldCopy} onCopy={onCopy} copyState={copyState}>
        <div style={{
          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
          borderRadius: "8px",
          padding: "18px 20px",
        }}>
          <p style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: "0 0 6px", lineHeight: 1.3 }}>
            {data.aboveFold.headline}
          </p>
          <p style={{ fontSize: "14px", color: "#374151", margin: "0 0 12px", lineHeight: 1.6 }}>
            {data.aboveFold.subheadline}
          </p>
          <span className="badge badge-blue">{data.aboveFold.cta}</span>
        </div>
      </ContentCard>

      {/* Problem + Solution side by side */}
      <div style={{ display: "grid", gap: "12px" }} className="sm:grid-cols-2">
        <ContentCard title="Problem Section" copyText={problemCopy} onCopy={onCopy} copyState={copyState}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: "0 0 8px" }}>
            {data.problemSection.headline}
          </p>
          <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.65, margin: 0 }}>
            {data.problemSection.body}
          </p>
        </ContentCard>

        <ContentCard title="Solution Section" copyText={solutionCopy} onCopy={onCopy} copyState={copyState}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: "0 0 8px" }}>
            {data.solutionSection.headline}
          </p>
          <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.65, margin: 0 }}>
            {data.solutionSection.body}
          </p>
        </ContentCard>
      </div>

      {/* Proof */}
      <ContentCard title="Proof Section" copyText={proofCopy} onCopy={onCopy} copyState={copyState}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: "0 0 10px" }}>
          {data.proofSection.headline}
        </p>
        {data.proofSection.points.map((point, i) => (
          <div key={i} className="proof-item">
            <span className="proof-dot" />
            <span>{point}</span>
          </div>
        ))}
      </ContentCard>

      {/* Offer stack */}
      <ContentCard title="Offer Stack" copyText={offerCopy} onCopy={onCopy} copyState={copyState}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: "0 0 10px" }}>
          {data.offerStack.headline}
        </p>
        {data.offerStack.items.map((item, i) => (
          <div key={i} className="proof-item">
            <span className="proof-dot" style={{ background: "var(--color-success)" }} />
            <span>{item}</span>
          </div>
        ))}
      </ContentCard>

      {/* Final CTA */}
      <ContentCard title="Final CTA" copyText={ctaCopy} onCopy={onCopy} copyState={copyState}>
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: "0 0 8px", lineHeight: 1.3 }}>
          {data.finalCta.headline}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span className="badge badge-blue" style={{ fontSize: "12px", padding: "4px 12px" }}>
            {data.finalCta.button}
          </span>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
            {data.finalCta.urgency}
          </span>
        </div>
      </ContentCard>
    </>
  );
});

const VideoConceptsRenderer = memo(function VideoConceptsRenderer({
  data, onCopy, copyState,
}: { data: VideoConceptsContent; onCopy: (l: string, v: string) => void; copyState: string | null }) {
  return (
    <>
      {data.concepts.map((concept, index) => {
        const copyText = [
          `TITLE\n${concept.title}`,
          `PLATFORM\n${concept.platform}`,
          `HOOK\n${concept.hook}`,
          `STRUCTURE\n${concept.structure.map((item, i) => `${i + 1}. ${item}`).join("\n")}`,
          `SCRIPT\n${concept.script}`,
          `B-ROLL\n${concept.brollSuggestions.join("\n")}`,
          `ON-SCREEN TEXT\n${concept.onScreenText.join("\n")}`,
          `VOICEOVER\n${concept.voiceover}`,
          `CTA\n${concept.cta}`,
          `DURATION\n${concept.estimatedDuration}`,
          `FACELESS\n${concept.faceless ? "Yes" : "No"}`,
        ].join("\n\n");

        return (
          <ContentCard key={concept.title} title={`Video Concept ${index + 1}`} copyText={copyText} onCopy={onCopy} copyState={copyState}>
            <details open={index === 0}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "#111827", marginBottom: "10px" }}>
                {concept.title} · {concept.platform}
              </summary>
              <div className="script-block"><p className="script-block-label">First 3 Seconds</p><p className="script-block-text">{concept.hook}</p></div>
              <div className="script-block"><p className="script-block-label">Structure</p>{concept.structure.map((item, i) => <div key={item} className="proof-item"><span className="proof-dot" /><span>{i + 1}. {item}</span></div>)}</div>
              <div className="script-block"><p className="script-block-label">Script</p><p className="script-block-text" style={{ whiteSpace: "pre-wrap" }}>{concept.script}</p></div>
              <div className="script-block"><p className="script-block-label">B-roll</p><p className="script-block-text">{concept.brollSuggestions.join(" · ")}</p></div>
              <div className="script-block"><p className="script-block-label">On-Screen Text</p><p className="script-block-text">{concept.onScreenText.join(" · ")}</p></div>
              <div className="script-block"><p className="script-block-label">Voiceover</p><p className="script-block-text">{concept.voiceover}</p></div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span className="badge badge-blue">{concept.cta}</span>
                <span className="badge badge-neutral">{concept.estimatedDuration}</span>
                <span className="badge badge-neutral">{concept.faceless ? "Faceless" : "On-camera"}</span>
              </div>
            </details>
          </ContentCard>
        );
      })}
    </>
  );
});

const ContentCalendarRenderer = memo(function ContentCalendarRenderer({
  data, onCopy, copyState,
}: { data: ContentCalendarContent; onCopy: (l: string, v: string) => void; copyState: string | null }) {
  const copyText = data.calendar
    .map((item) => `${item.day},${item.date},${item.platform},${item.contentType},"${item.hook}","${item.notes}","${item.hashtags.join(" ")}"`)
    .join("\n");

  return (
    <ContentCard title="30-Day Content Calendar" copyText={copyText} onCopy={onCopy} copyState={copyState}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#475569" }}>
              {["Day", "Platform", "Type", "Hook", "Format"].map((heading) => (
                <th key={heading} style={{ padding: "8px", borderBottom: "1px solid #E5E7EB" }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.calendar.map((item) => (
              <tr key={`${item.day}-${item.hook}`}>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #F3F4F6", fontWeight: 700 }}>{item.day}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #F3F4F6" }}>{item.platform}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #F3F4F6" }}>{item.contentType}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #F3F4F6", minWidth: "240px" }}>{item.hook}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #F3F4F6" }}>{item.format}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContentCard>
  );
});

const CreativePromptsRenderer = memo(function CreativePromptsRenderer({
  data, onCopy, copyState,
}: { data: CreativePromptsContent; onCopy: (l: string, v: string) => void; copyState: string | null }) {
  const groups = [
    ["Image Prompts", data.imagePrompts],
    ["Video Prompts", data.videoPrompts],
    ["Thumbnail Prompts", data.thumbnailPrompts],
  ] as const;

  return (
    <>
      {groups.map(([title, prompts]) => (
        <ContentCard key={title} title={title} copyText={prompts.map((item) => `${item.purpose}\n${item.prompt}`).join("\n\n---\n\n")} onCopy={onCopy} copyState={copyState}>
          {prompts.map((item, index) => (
            <div key={`${title}-${index}`} style={{ marginBottom: index < prompts.length - 1 ? "12px" : 0 }}>
              <p className="script-block-label">{item.purpose}</p>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#0F172A", color: "#E2E8F0", borderRadius: "8px", padding: "12px", fontSize: "12px", lineHeight: 1.6 }}>
                {"negativePrompt" in item
                  ? `${item.prompt}\n\nNegative: ${item.negativePrompt}\nDimensions: ${item.dimensions}\nStyle: ${item.style}`
                  : "duration" in item
                    ? `${item.prompt}\n\nDuration: ${item.duration}\nStyle: ${item.style}`
                    : item.prompt}
              </pre>
            </div>
          ))}
        </ContentCard>
      ))}
    </>
  );
});

// ─── Platform dispatcher ──────────────────────────────────────────────────────

const PlatformRenderer = memo(function PlatformRenderer({
  platform, content, onCopy, copyState,
}: {
  platform: PlatformKey;
  content: unknown;
  onCopy: (label: string, value: string) => void;
  copyState: string | null;
}) {
  if (!content) {
    return (
      <div className="card">
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: "0 0 6px" }}>
          This section is not available yet
        </p>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>
          Retry generation to fill in the missing output for this platform.
        </p>
      </div>
    );
  }

  if (platform === "tiktok-reels") {
    return <TikTokRenderer data={content as TikTokContent} onCopy={onCopy} copyState={copyState} />;
  }
  if (platform === "facebook-meta-ads") {
    return <FacebookRenderer data={content as FacebookAdsContent} onCopy={onCopy} copyState={copyState} />;
  }
  if (platform === "product-page-copy") {
    return <ProductPageRenderer data={content as ProductPageContent} onCopy={onCopy} copyState={copyState} />;
  }
  if (platform === "email-promo") {
    return <EmailRenderer data={content as EmailContent} onCopy={onCopy} copyState={copyState} />;
  }
  if (platform === "video-concepts") {
    return <VideoConceptsRenderer data={content as VideoConceptsContent} onCopy={onCopy} copyState={copyState} />;
  }
  if (platform === "content-calendar") {
    return <ContentCalendarRenderer data={content as ContentCalendarContent} onCopy={onCopy} copyState={copyState} />;
  }
  if (platform === "creative-prompts") {
    return <CreativePromptsRenderer data={content as CreativePromptsContent} onCopy={onCopy} copyState={copyState} />;
  }
  return <LandingPageRenderer data={content as LandingPageContent} onCopy={onCopy} copyState={copyState} />;
});

// ─── Score color helper ───────────────────────────────────────────────────────

function scoreToColor(status: "green" | "amber" | "red") {
  if (status === "green") return "var(--color-success)";
  if (status === "amber") return "var(--color-warning)";
  return "var(--color-error)";
}

function numericScoreToStatus(score: number) {
  if (score >= 80) return "green";
  if (score >= 60) return "amber";
  return "red";
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ResultsClient({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const toastCounter = useRef(0);

  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformKey | null>(null);
  const [strategyOpen, setStrategyOpen] = useState(() => (
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false
  ));
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [actionState, setActionState] = useState<"idle" | "saving" | "regenerating">("idle");
  const [copyState, setCopyState] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function showToast(message: string, type: ToastType = "info") {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }

  useEffect(() => {
    async function loadCampaign() {
      try {
        const response = await fetch(`/api/campaigns?id=${campaignId}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load campaign.");
        const record = payload.campaign as CampaignRecord;
        setCampaign(record);
        setActivePlatform((Object.keys(record.generated_content)[0] as PlatformKey | undefined) ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load campaign.");
      } finally {
        setLoading(false);
      }
    }
    void loadCampaign();
  }, [campaignId]);

  const scoreColor = useMemo(() => {
    if (!campaign) return "var(--color-text-secondary)";
    return scoreToColor(campaign.commerce_scores.status);
  }, [campaign]);

  const platformKeys = useMemo(
    () => (campaign ? (Object.keys(campaign.generated_content) as PlatformKey[]) : []),
    [campaign],
  );

  const campaignAnalysis = useMemo<CampaignAnalysis | null>(
    () => (campaign ? analyzeCampaign(campaign.generated_content) : null),
    [campaign],
  );

  const campaignAnalysisColor = useMemo(() => {
    if (!campaignAnalysis) return "var(--color-text-secondary)";
    return scoreToColor(numericScoreToStatus(campaignAnalysis.score));
  }, [campaignAnalysis]);

  const missingPlatforms = useMemo(
    () => (
      campaign
        ? campaign.offer_data.platforms.filter((platform) => !campaign.generated_content[platform])
        : []
    ),
    [campaign],
  );

  const selectedPlatform = useMemo(() => {
    if (activePlatform && platformKeys.includes(activePlatform)) {
      return activePlatform;
    }

    return platformKeys[0] ?? null;
  }, [activePlatform, platformKeys]);

  async function handleCopy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(label);
      showToast("Copied to clipboard.", "success");
      window.setTimeout(() => setCopyState(null), 2000);
    } catch {
      showToast("Could not copy to clipboard.", "error");
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleExport(format: "pdf" | "txt" | "csv" | "meta") {
    if (!campaign) return;
    setExportMenuOpen(false);

    if (format === "pdf") {
      downloadBlob(exportAsPDF(campaign), getExportFilename(campaign, "pdf"));
      return;
    }

    if (format === "csv") {
      downloadBlob(
        new Blob([exportAsContentCalendar(campaign)], { type: "text/csv;charset=utf-8" }),
        getExportFilename(campaign, "csv"),
      );
      return;
    }

    if (format === "meta") {
      downloadBlob(
        new Blob([exportAsMetaAds(campaign)], { type: "text/plain;charset=utf-8" }),
        getExportFilename(campaign, "meta-ads.txt"),
      );
      return;
    }

    downloadBlob(
      new Blob([exportAsText(campaign)], { type: "text/plain;charset=utf-8" }),
      getExportFilename(campaign, "txt"),
    );
  }

  async function getAccessToken() {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function handleSave() {
    if (!campaign) return;
    setActionState("saving");
    try {
      const token = await getAccessToken();
      if (!token) { router.push(`/login?redirect=/results/${campaign.id}`); return; }

      const payload: SaveCampaignRequestBody = {
        campaignId: campaign.id,
        offerData: campaign.offer_data,
        strategyBrief: campaign.strategy_brief,
        generatedContent: campaign.generated_content,
        commerceScores: campaign.commerce_scores,
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Unable to save campaign.");
      setCampaign(result.campaign as CampaignRecord);
      showToast("Campaign saved to dashboard.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not save.", "error");
    } finally {
      setActionState("idle");
    }
  }

  async function handleGenerateAgain() {
    if (!campaign) return;
    setActionState("regenerating");
    try {
      const stratRes = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerData: campaign.offer_data }),
      });
      const stratPayload = await stratRes.json();
      if (!stratRes.ok) throw new Error(stratPayload.error || "Strategy generation failed.");

      const strategyBrief = stratPayload.strategyBrief as StrategyBrief;
      const targetPlatforms = missingPlatforms.length > 0
        ? missingPlatforms
        : campaign.offer_data.platforms;

      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerData: campaign.offer_data,
          strategyBrief,
          platforms: targetPlatforms,
        }),
      });
      const genPayload = await genRes.json() as GenerateResponseBody & { error?: string };
      if (!genRes.ok) throw new Error(genPayload.error || "Content generation failed.");

      const token = await getAccessToken();
      const commerceScores = calculateCommerceScores(campaign.offer_data, strategyBrief);
      const mergedContent = missingPlatforms.length > 0
        ? { ...campaign.generated_content, ...genPayload.generatedContent }
        : genPayload.generatedContent;
      const saveRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...(missingPlatforms.length > 0 ? { campaignId: campaign.id } : {}),
          offerData: campaign.offer_data,
          strategyBrief,
          generatedContent: mergedContent,
          commerceScores,
        } satisfies SaveCampaignRequestBody),
      });
      const savePayload = await saveRes.json();
      if (!saveRes.ok) throw new Error(savePayload.error || "Could not save.");
      if (genPayload.failedPlatforms.length > 0) {
        showToast(`Still missing sections: ${genPayload.failedPlatforms.map((issue) => PLATFORM_LABELS[issue.platform]).join(", ")}.`, "error");
      }
      router.push(`/results/${savePayload.campaign.id}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not regenerate.", "error");
      setActionState("idle");
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--color-background)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "white", border: "1px solid var(--color-border-light)",
          borderRadius: "10px", padding: "14px 20px",
          fontSize: "13px", color: "var(--color-text-secondary)",
        }}>
          <Loader2 style={{ width: "14px", height: "14px", animation: "spin 0.65s linear infinite" }} />
          Loading campaign results…
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !campaign) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--color-background)", padding: "24px" }}>
        <div className="card" style={{ maxWidth: "440px", textAlign: "center" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 10px" }}>Campaign unavailable</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 20px" }}>
            {error || "The requested campaign could not be loaded."}
          </p>
          <Link href="/generate" className="btn-primary" style={{ display: "inline-flex" }}>
            Back to generator
          </Link>
        </div>
      </div>
    );
  }

  const isBusy = actionState !== "idle";

  return (
    <div className="results-shell page-enter">
      <ToastContainer toasts={toasts} />

      <header className="app-nav">
        <div className="app-nav-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
            <Link href="/" className="nav-logo">Cloud Nexus AI</Link>
            <span style={{ fontSize: "13px", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              / {campaign.title}
            </span>
          </div>
          <Link href="/dashboard" className="btn-secondary" style={{ padding: "8px 14px", fontSize: "13px" }}>
            Dashboard
          </Link>
        </div>
      </header>

      <div className="results-layout">
        <button
          type="button"
          className="btn-secondary results-mobile-summary-toggle"
          onClick={() => setMobileSummaryOpen((current) => !current)}
          aria-expanded={mobileSummaryOpen}
        >
          <span>Campaign Summary</span>
          {mobileSummaryOpen ? <ChevronUp style={{ width: "14px", height: "14px" }} aria-hidden="true" /> : <ChevronDown style={{ width: "14px", height: "14px" }} aria-hidden="true" />}
        </button>

        <aside className={`results-sidebar results-sidebar-desktop${mobileSummaryOpen ? " results-sidebar-open" : ""}`}>
          <div className="results-summary-card">
            <span className="badge badge-blue" style={{ marginBottom: "10px" }}>Campaign Generated</span>
            <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>{campaign.title}</h1>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)" }}>
              {campaign.offer_data.platforms.length} platforms · Generated just now
            </p>
          </div>

          <div className="results-summary-card">
            <p className="lbl" style={{ marginBottom: "10px" }}>Commerce Score</p>
            <p style={{ fontSize: "48px", fontWeight: 700, color: scoreColor, lineHeight: 1, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
              {campaign.commerce_scores.overall}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {campaign.commerce_scores.metrics.map((m) => (
                <div key={m.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "12px", color: "#374151", fontWeight: 500 }}>{m.label}</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: scoreColor }}>{m.score}</span>
                  </div>
                  <div style={{ height: "3px", borderRadius: "2px", background: "#f3f4f6" }}>
                    <div style={{ height: "100%", width: `${m.score}%`, background: scoreColor, borderRadius: "2px", transition: "width 0.5s ease" }} />
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: "2px 0 0", lineHeight: 1.4 }}>{m.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {campaignAnalysis && (
            <div className="results-summary-card">
              <p className="lbl" style={{ marginBottom: "10px" }}>Campaign Score</p>
              <p style={{ fontSize: "48px", fontWeight: 700, color: campaignAnalysisColor, lineHeight: 1, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
                {campaignAnalysis.score}
              </p>
              <div className="analysis-mini-bars" style={{ marginBottom: campaignAnalysis.suggestions.length > 0 ? "14px" : 0 }}>
                {[
                  { label: "Clarity", value: campaignAnalysis.breakdown.clarity },
                  { label: "Urgency", value: campaignAnalysis.breakdown.urgency },
                  { label: "Differentiation", value: campaignAnalysis.breakdown.differentiation },
                  { label: "Trust", value: campaignAnalysis.breakdown.trust },
                ].map((item) => {
                  const barColor = scoreToColor(numericScoreToStatus(item.value));
                  return (
                    <div key={item.label}>
                      <div className="analysis-mini-bar-header">
                        <span>{item.label}</span>
                        <span style={{ color: barColor }}>{item.value}</span>
                      </div>
                      <div className="analysis-mini-bar-track">
                        <div
                          className="analysis-mini-bar-fill"
                          style={{ width: `${item.value}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {campaignAnalysis.suggestions.length > 0 && (
                <div>
                  <p className="lbl" style={{ marginBottom: "8px" }}>Improve Next</p>
                  <ul className="analysis-suggestions">
                    {campaignAnalysis.suggestions.slice(0, 3).map((suggestion) => (
                      <li key={suggestion}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="results-summary-card">
            <p className="lbl" style={{ marginBottom: "10px" }}>Campaign Details</p>
            {[
              ["Offer", campaign.offer_data.offerName],
              ["Category", campaign.offer_data.category],
              ["Price", `$${campaign.offer_data.price}`],
              ["CTA", campaign.offer_data.primaryCta],
              ["Tone", campaign.offer_data.brandTone],
              ["Platforms", campaign.offer_data.platforms.map((p) => PLATFORM_LABELS[p]).join(", ")],
              ["Created", new Date(campaign.created_at).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} className="data-row">
                <span className="data-key">{k}</span>
                <span className="data-val" style={{ maxWidth: "140px", wordBreak: "break-word", textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="results-actions">
            <div style={{ position: "relative" }}>
              <button type="button" onClick={() => setExportMenuOpen((value) => !value)} className="btn-secondary" style={{ width: "100%", justifyContent: "center", minHeight: "44px" }} aria-expanded={exportMenuOpen}>
                <Download style={{ width: "14px", height: "14px" }} aria-hidden="true" />
                Export Campaign Pack ↓
              </button>
              {exportMenuOpen && (
                <div style={{ position: "absolute", top: "48px", left: 0, right: 0, zIndex: 20, background: "white", border: "1px solid var(--color-border-light)", borderRadius: "8px", boxShadow: "0 14px 28px rgba(15,23,42,0.12)", overflow: "hidden" }}>
                  {[
                    ["Download PDF (full campaign pack)", "pdf"],
                    ["Download Text Bundle (.txt)", "txt"],
                    ["Download Content Calendar (.csv)", "csv"],
                    ["Download Meta Ads Format (.txt)", "meta"],
                  ].map(([label, format]) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => handleExport(format as "pdf" | "txt" | "csv" | "meta")}
                      style={{ width: "100%", textAlign: "left", padding: "11px 12px", border: "none", background: "white", cursor: "pointer", fontSize: "13px", color: "#334155" }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => void handleSave()} disabled={isBusy} className="btn-secondary" style={{ width: "100%", justifyContent: "center", minHeight: "44px" }}>
              {actionState === "saving" ? <span className="spinner spinner-gray" aria-hidden="true" /> : <Save style={{ width: "14px", height: "14px" }} aria-hidden="true" />}
              Save to Dashboard
            </button>
            <button
              type="button"
              onClick={() => void handleGenerateAgain()}
              disabled={isBusy}
              className="btn-ghost"
              style={{ justifyContent: "center", minHeight: "44px" }}
            >
              {actionState === "regenerating" ? <span className="spinner spinner-gray" aria-hidden="true" /> : <RefreshCcw style={{ width: "14px", height: "14px" }} aria-hidden="true" />}
              Generate Again
            </button>
          </div>
        </aside>

        <main className="results-main">
          {missingPlatforms.length > 0 && (
            <div className="callout callout-warning" style={{ marginBottom: "16px" }}>
              <div>
                <span className="callout-label">Some outputs are missing</span>
                <p className="callout-copy">
                  Available sections are shown below. Retry to fill: {missingPlatforms.map((platform) => PLATFORM_LABELS[platform]).join(", ")}.
                </p>
              </div>
            </div>
          )}

          <div className="strategy-brief-panel">
            <button
              type="button"
              onClick={() => setStrategyOpen((value) => !value)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
            >
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>
                {strategyOpen ? "Hide Strategy Brief ↑" : "View Strategy Brief ↓"}
              </span>
            </button>

            {strategyOpen && (
              <div className="strategy-brief-grid" style={{ marginTop: "16px" }}>
                {[
                  { title: "Positioning", value: campaign.strategy_brief.positioningSummary },
                  { title: "Emotional Hook", value: campaign.strategy_brief.primaryEmotionalHook },
                  { title: "Audience Awareness", value: campaign.strategy_brief.audienceAwarenessLevel },
                  { title: "Content Priority", value: campaign.strategy_brief.contentPriority },
                ].map(({ title, value }) => (
                  <div key={title}>
                    <p className="lbl-blue" style={{ marginBottom: "6px" }}>{title}</p>
                    <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.65, margin: 0 }}>{value}</p>
                  </div>
                ))}
                {[
                  { title: "Top Angles", items: campaign.strategy_brief.topAngles.map((a) => `${a.angle} — ${a.rationale}`) },
                  { title: "Objections", items: campaign.strategy_brief.topObjections },
                  { title: "Best Channels", items: campaign.strategy_brief.bestChannels },
                ].map(({ title, items }) => (
                  <div key={title}>
                    <p className="lbl-blue" style={{ marginBottom: "6px" }}>{title}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {items.map((item) => (
                        <div key={item} className="list-accent" style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="platform-tabs">
            {platformKeys.map((platform) => {
              const active = selectedPlatform === platform;
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setActivePlatform(platform)}
                  className={`platform-tab${active ? " platform-tab-active" : ""}`}
                >
                  {PLATFORM_LABELS[platform]}
                </button>
              );
            })}
          </div>

          {/* Content */}
          {selectedPlatform && (
            <PlatformRenderer
              platform={selectedPlatform}
              content={campaign.generated_content[selectedPlatform]}
              onCopy={handleCopy}
              copyState={copyState}
            />
          )}
          {!selectedPlatform && (
            <div className="card">
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: "0 0 6px" }}>
                No generated sections available yet
              </p>
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>
                Retry generation to build the first platform output.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
