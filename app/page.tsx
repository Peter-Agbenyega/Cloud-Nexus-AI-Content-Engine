"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, Check, FileStack, Menu, Target, X } from "lucide-react";

import { ProductIdeasSection } from "@/components/ideas/product-ideas-section";

const features = [
  {
    icon: BrainCircuit,
    title: "Strategy before content",
    description:
      "Every campaign starts with a positioning brief — angles, objections, hooks, and channels — before a single word of copy is written.",
  },
  {
    icon: Target,
    title: "Built for commerce",
    description:
      "Designed for ecommerce sellers, digital product creators, and performance marketers who need copy that converts, not content that fills space.",
  },
  {
    icon: FileStack,
    title: "One brief, full pack",
    description:
      "A single offer brief produces TikTok scripts, Meta ad variants, product page copy, email, and a landing page — all aligned to the same strategy.",
  },
];

const steps = [
  {
    number: 1,
    title: "Brief",
    description: "Describe your offer, audience, and goal in 3 minutes",
  },
  {
    number: 2,
    title: "Strategy",
    description: "AI analyzes your offer and builds a conversion brief",
  },
  {
    number: 3,
    title: "Content",
    description: "Get TikTok scripts, Meta ads, emails, and more",
  },
];

const FREE_FEATURES = ["1 campaign per month", "All 5 platforms", "Text export"];
const STARTER_FEATURES = [
  "10 campaigns / month",
  "All 5 platforms",
  "Export + save to dashboard",
  "Priority generation",
];
const PRO_FEATURES = [
  "Unlimited campaigns",
  "All 5 platforms",
  "Export + save to dashboard",
  "Priority generation",
  "Team sharing",
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="marketing-shell page-enter">
      <header className="app-nav">
        <div className="app-nav-inner">
          <Link href="/" className="nav-logo">Cloud Nexus AI</Link>

          <nav className="hidden md:flex" style={{ alignItems: "center", gap: "22px" }}>
            <a href="#how-it-works" style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
              How it works
            </a>
            <a href="#pricing" style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
              Pricing
            </a>
            <Link href="/login" className="btn-secondary" style={{ padding: "8px 14px", fontSize: "13px" }}>
              Login
            </Link>
          </nav>

          <button
            type="button"
            className="mobile-nav-toggle md:hidden"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-overlay"
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? <X style={{ width: "18px", height: "18px" }} aria-hidden="true" /> : <Menu style={{ width: "18px", height: "18px" }} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div id="mobile-nav-overlay" className="mobile-nav-overlay md:hidden">
          <div className="mobile-nav-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <Link href="/" className="nav-logo" onClick={() => setMobileMenuOpen(false)}>
                Cloud Nexus AI
              </Link>
              <button
                type="button"
                className="mobile-nav-toggle"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X style={{ width: "18px", height: "18px" }} aria-hidden="true" />
              </button>
            </div>

            <nav className="mobile-nav-links" aria-label="Mobile">
              <a href="#how-it-works" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                How it works
              </a>
              <a href="#pricing" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </a>
              <Link href="/login" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                Login
              </Link>
              <Link href="/generate" className="btn-primary" style={{ marginTop: "8px" }} onClick={() => setMobileMenuOpen(false)}>
                Generate My First Campaign →
              </Link>
            </nav>
          </div>
        </div>
      )}

      <main>
        <section className="marketing-hero">
          <div className="page-section">
            <div className="hero-grid">
              <div style={{ textAlign: "left" }} className="max-md:text-center max-md:mx-auto">
                <span className="hero-badge">Commerce-First AI Campaign Engine</span>
                <h1 className="hero-headline">Create content that sells.</h1>
                <p className="hero-subheadline">Not just content.</p>
                <p className="hero-copy">
                  One offer brief. One strategy pass. A full campaign pack across every channel — ready to launch.
                </p>

                <div className="hero-actions">
                  <Link href="/generate" className="btn-primary" style={{ padding: "14px 28px", fontSize: "15px" }}>
                    Generate My First Campaign <ArrowRight style={{ width: "15px", height: "15px" }} aria-hidden="true" />
                  </Link>
                  <Link href="/dashboard" className="btn-secondary" style={{ padding: "14px 28px", fontSize: "15px", borderWidth: "1.5px" }}>
                    View Dashboard
                  </Link>
                </div>
              </div>

              <div className="hero-preview">
                <p className="lbl" style={{ margin: "0 0 14px" }}>What You Get</p>
                <div className="hero-preview-list">
                  {[
                    { platform: "TikTok / Reels", detail: "3 hooks · full script · 3 captions" },
                    { platform: "Facebook / Meta", detail: "3 ad variants · short/med/long text" },
                    { platform: "Product Page", detail: "Hero copy · 5 bullets · FAQs" },
                    { platform: "Email Promo", detail: "3 subject lines · full email body" },
                    { platform: "Landing Page", detail: "Above-fold to final CTA" },
                  ].map(({ platform, detail }) => (
                    <div key={platform} className="hero-preview-item">
                      <strong>{platform}</strong>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "14px", padding: "14px", borderRadius: "12px", background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#0369A1", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Strategy Brief Included
                  </p>
                  <p style={{ margin: 0, fontSize: "14px", color: "#0F172A" }}>
                    Positioning, top angles, objections, hooks, and channel priority before content generation starts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="steps-section">
          <div className="page-section">
            <h2 className="section-heading" style={{ textAlign: "center", marginBottom: "36px" }}>
              Three steps. One campaign pack.
            </h2>
            <div className="steps-grid md:grid-cols-3">
              {steps.map((step, index) => (
                <article key={step.number} className="step-card">
                  <span className="step-circle">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {index < steps.length - 1 && <span className="step-connector hidden md:block" aria-hidden="true" />}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="page-section">
            <div className="features-grid">
              {features.map(({ icon: Icon, title, description }) => (
                <article key={title} className="feature-card">
                  <span className="feature-icon">
                    <Icon style={{ width: "20px", height: "20px" }} aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <ProductIdeasSection />

        <section id="pricing" className="pricing-section">
          <div className="page-section">
            <h2 className="section-heading" style={{ textAlign: "center", marginBottom: "36px" }}>
              Simple plans for operators
            </h2>
            <div className="pricing-grid">
              <PricingCard name="Free" price="$0" description="Test the workflow. Generate your first campaign." features={FREE_FEATURES} />
              <PricingCard name="Starter" price="$19" description="For solo sellers running repeat campaign generation." features={STARTER_FEATURES} />
              <PricingCard name="Pro" price="$49" description="For operators managing multiple offers and deeper iteration." features={PRO_FEATURES} featured />
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-section site-footer-row">
          <span>Cloud Nexus AI Content Engine</span>
          <span>© 2026 Cloud Nexus Market. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  featured = false,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <article className={`pricing-card${featured ? " pricing-card-featured" : ""}`}>
      {featured && (
        <span className="badge badge-blue" style={{ position: "absolute", top: "16px", right: "16px" }}>
          Most Popular
        </span>
      )}
      <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600, color: featured ? "var(--color-primary)" : "var(--color-text-secondary)" }}>
        {name}
      </p>
      <p className="pricing-card-price">
        {price}
        {price !== "$0" && <span>/mo</span>}
      </p>
      <p>{description}</p>
      <ul className="pricing-list">
        {features.map((feature) => (
          <li key={feature}>
            <Check style={{ width: "16px", height: "16px", color: "var(--color-success)", flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/generate"
        className={featured ? "btn-primary" : "btn-secondary"}
        style={{ width: "100%", justifyContent: "center", minHeight: "44px" }}
      >
        Get started
      </Link>
    </article>
  );
}
