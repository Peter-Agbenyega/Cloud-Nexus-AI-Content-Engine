"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PaidPlanKey = "starter" | "pro" | "agency";

interface PricingPlan {
  key: "free" | PaidPlanKey;
  name: string;
  price: string;
  features: string[];
  popular: boolean;
}

export function PricingClient({ plans }: { plans: PricingPlan[] }) {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanKey | null>(null);
  const [error, setError] = useState("");

  async function startCheckout(planKey: PaidPlanKey) {
    setLoadingPlan(planKey);
    setError("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout.");
      }

      router.push(data.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not start checkout.",
      );
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F8FAFC", color: "#0F172A" }}>
      <section style={{ maxWidth: "1180px", margin: "0 auto", padding: "56px 20px 72px" }}>
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <Link href="/" className="nav-logo" style={{ display: "inline-block", marginBottom: "18px" }}>
            Cloud Nexus AI
          </Link>
          <h1 style={{ fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 1, margin: "0 0 14px", fontWeight: 800 }}>
            Pick the plan that matches your content engine
          </h1>
          <p style={{ maxWidth: "680px", margin: "0 auto", color: "#475569", fontSize: "17px", lineHeight: 1.6 }}>
            Start free, then upgrade when you need more campaigns, platforms, brand profiles, and export formats.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", alignItems: "center", marginBottom: "34px" }}>
          <span style={{ fontWeight: annual ? 500 : 700 }}>Monthly</span>
          <button
            type="button"
            aria-pressed={annual}
            onClick={() => setAnnual((value) => !value)}
            style={{
              width: "58px",
              height: "32px",
              borderRadius: "999px",
              border: "1px solid #CBD5E1",
              background: annual ? "#0EA5E9" : "#E2E8F0",
              padding: "3px",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                display: "block",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "white",
                transform: annual ? "translateX(26px)" : "translateX(0)",
                transition: "transform 120ms ease",
              }}
            />
          </button>
          <span style={{ fontWeight: annual ? 700 : 500 }}>Annual <span style={{ color: "#0284C7" }}>(20% off)</span></span>
        </div>

        {error && (
          <div role="alert" style={{ maxWidth: "620px", margin: "0 auto 22px", padding: "12px 14px", borderRadius: "8px", border: "1px solid #FCA5A5", color: "#B91C1C", background: "#FEF2F2" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px", alignItems: "stretch" }}>
          {plans.map((plan) => (
            <article
              key={plan.key}
              style={{
                position: "relative",
                border: plan.popular ? "2px solid #0EA5E9" : "1px solid #E2E8F0",
                background: "white",
                borderRadius: "8px",
                padding: "24px",
                boxShadow: plan.popular ? "0 18px 40px rgba(14,165,233,0.16)" : "0 12px 24px rgba(15,23,42,0.05)",
              }}
            >
              {plan.popular && (
                <div style={{ position: "absolute", top: "-13px", left: "24px", background: "#0EA5E9", color: "white", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 800 }}>
                  Most Popular
                </div>
              )}
              <h2 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: 800 }}>{plan.name}</h2>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "18px" }}>
                <span style={{ fontSize: "38px", fontWeight: 900 }}>{annual && plan.key !== "free" ? discountPrice(plan.price) : plan.price}</span>
                <span style={{ color: "#64748B" }}>/mo</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: "10px" }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ display: "flex", gap: "8px", color: "#334155", lineHeight: 1.4 }}>
                    <span style={{ color: "#0284C7", fontWeight: 900 }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.key === "free" ? (
                <Link href="/generate" className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                  Get Started Free
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void startCheckout(plan.key as PaidPlanKey)}
                  disabled={loadingPlan === plan.key}
                  style={{ width: "100%", justifyContent: "center", minHeight: "44px", opacity: loadingPlan === plan.key ? 0.7 : 1 }}
                >
                  {loadingPlan === plan.key ? "Starting checkout..." : "Subscribe Now"}
                </button>
              )}
            </article>
          ))}
        </div>

        <div style={{ margin: "34px auto 0", maxWidth: "760px", textAlign: "center", padding: "14px 18px", border: "1px solid #BAE6FD", background: "#F0F9FF", borderRadius: "8px", fontWeight: 700, color: "#075985" }}>
          30-day money-back guarantee on paid plans
        </div>

        <section style={{ marginTop: "54px" }}>
          <h2 style={{ textAlign: "center", fontSize: "28px", marginBottom: "22px" }}>FAQs</h2>
          <div style={{ display: "grid", gap: "14px", maxWidth: "860px", margin: "0 auto" }}>
            {[
              ["Can I change plans later?", "Yes. You can upgrade, downgrade, or cancel from the billing portal."],
              ["What counts as a campaign?", "A campaign is counted when you save a generated campaign pack."],
              ["Do annual prices charge today?", "The annual toggle is visual for now. Checkout uses the monthly Stripe prices configured in your account."],
            ].map(([question, answer]) => (
              <div key={question} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "18px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>{question}</h3>
                <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>{answer}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function discountPrice(price: string) {
  const amount = Number(price.replace("$", ""));
  if (!amount) return price;
  return `$${Math.round(amount * 0.8)}`;
}
