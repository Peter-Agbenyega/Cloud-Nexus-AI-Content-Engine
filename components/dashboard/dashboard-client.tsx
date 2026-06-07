"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, Plus } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CampaignRecord } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/constants";
import { PlatformKey } from "@/lib/types";

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? "badge-green" : score >= 60 ? "badge-amber" : "badge-red";
  return <span className={`badge ${cls}`}>{score}</span>;
}

export function DashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          window.location.href = "/login?redirect=/dashboard";
          return;
        }
        setEmail(session.user.email ?? null);

        const res = await fetch("/api/campaigns", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Unable to load campaigns.");
        setCampaigns(payload.campaigns as CampaignRecord[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="dashboard-shell page-enter">
      <header className="app-nav">
        <div className="app-nav-inner">
          <Link href="/" className="nav-logo">Cloud Nexus AI</Link>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Link href="/generate" className="btn-primary" style={{ padding: "10px 14px", fontSize: "13px", minHeight: "44px" }}>
              <Plus style={{ width: "13px", height: "13px" }} aria-hidden="true" />
              New Campaign
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="btn-ghost"
              aria-label="Sign out"
            >
              <LogOut style={{ width: "13px", height: "13px" }} aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h1 className="dashboard-heading">Your Campaigns</h1>
            <p className="dashboard-subtext">
              {loading
                ? "Loading campaigns..."
                : `${campaigns.length} campaigns saved${email ? ` · ${email}` : ""}`}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" style={{
            padding: "10px 14px", borderRadius: "8px",
            border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.05)",
            fontSize: "13px", color: "var(--color-error)", marginBottom: "20px",
          }}>
            {error}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="dashboard-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="card" style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div className="skeleton" style={{ height: "16px", width: "55%" }} />
                  <div className="skeleton" style={{ height: "12px", width: "50px" }} />
                </div>
                <div className="skeleton" style={{ height: "12px", width: "80px", marginBottom: "8px", borderRadius: "999px" }} />
                <div className="skeleton" style={{ height: "12px", width: "100%", marginBottom: "4px" }} />
                <div className="skeleton" style={{ height: "12px", width: "65%" }} />
              </div>
            ))}
          </div>
        )}

        {/* Campaigns grid */}
        {!loading && !error && campaigns.length > 0 && (
          <div className="dashboard-grid">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && campaigns.length === 0 && (
          <div style={{ textAlign: "center", padding: "72px 24px" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "12px",
              background: "#f3f4f6", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 16px",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
              No campaigns yet. Your first one takes about 60 seconds →
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
              Describe one offer and Cloud Nexus AI will build the campaign pack, prompts, voiceover, music direction, and exports.
            </p>
            <Link href="/generate" className="btn-primary" style={{ display: "inline-flex" }}>
              Generate a Campaign →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: CampaignRecord }) {
  const platforms = campaign.offer_data.platforms as PlatformKey[];

  return (
    <Link
      href={`/results/${campaign.id}`}
      className="dashboard-card"
      style={{ display: "block", cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.35 }}>
          {campaign.title}
        </h2>
        <span style={{ fontSize: "12px", color: "var(--color-text-muted)", whiteSpace: "nowrap", flexShrink: 0, marginTop: "2px" }}>
          {relativeDate(campaign.created_at)}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <span className="badge badge-neutral">{campaign.offer_data.category}</span>
        <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>${campaign.offer_data.price}</span>
      </div>

      <p style={{
        fontSize: "14px", color: "var(--color-text-secondary)", margin: "0 0 14px",
        lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {campaign.offer_data.description}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
        {platforms.map((p) => (
          <span key={p} className="badge badge-blue">
            {PLATFORM_LABELS[p]}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <ScoreBadge score={campaign.commerce_scores.overall} />
        <span style={{ fontSize: "13px", color: "var(--color-primary)", fontWeight: 600 }}>
          View Campaign →
        </span>
      </div>
    </Link>
  );
}
