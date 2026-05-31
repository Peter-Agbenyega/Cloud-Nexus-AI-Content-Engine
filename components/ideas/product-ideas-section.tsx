"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { type ProductIdea, type ProductIdeasResponseBody } from "@/lib/types";

const IDEA_STORAGE_KEY = "cloud-nexus:selected-product-idea";

async function fetchIdeas() {
  const response = await fetch("/api/ideas", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const payload = await response.json() as ProductIdeasResponseBody & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load product ideas.");
  }

  return payload;
}

export function ProductIdeasSection() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<ProductIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const payload = await fetchIdeas();
        if (!active) return;
        setIdeas(payload.ideas.slice(0, 8));
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load ideas right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleIdeaClick = (idea: ProductIdea) => {
    window.sessionStorage.setItem(IDEA_STORAGE_KEY, JSON.stringify(idea));
    router.push("/generate?idea=1");
  };

  return (
    <section style={{ background: "var(--color-background)", padding: "64px 0 72px" }}>
      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ maxWidth: "640px", marginBottom: "24px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-primary)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>
            Product Idea Intelligence
          </p>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: "0 0 10px", lineHeight: 1.2 }}>
            Not sure what to sell?
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.65 }}>
            Start from an idea with cleaner pricing, stronger ecommerce fit, and easier ad angles. Pick one and the generator will prefill the form and start the draft automatically.
          </p>
        </div>

        {loading && (
          <div style={{ display: "grid", gap: "14px" }} className="lg:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="skeleton"
                style={{ minHeight: "198px", borderRadius: "14px" }}
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ background: "white", border: "1px solid var(--color-border)", borderRadius: "14px", padding: "18px 20px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#b91c1c", fontWeight: 600 }}>Could not load ideas.</p>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: "grid", gap: "14px" }} className="lg:grid-cols-2">
            {ideas.map((idea) => (
              <button
                key={idea.id}
                type="button"
                onClick={() => handleIdeaClick(idea)}
                className="idea-card"
                style={{
                  textAlign: "left",
                  background: "white",
                  border: "1px solid var(--color-border)",
                  borderRadius: "14px",
                  padding: "18px",
                  cursor: "pointer",
                  transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "var(--color-primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <Sparkles style={{ width: "12px", height: "12px" }} />
                    {idea.category}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#111827", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "999px", padding: "5px 10px" }}>
                    {idea.estimatedPrice}
                  </span>
                </div>

                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: "0 0 10px", lineHeight: 1.25 }}>
                  {idea.productName}
                </h3>

                <div style={{ display: "grid", gap: "10px" }}>
                  <IdeaLine label="Target audience" value={idea.targetAudience} />
                  <IdeaLine label="Hook idea" value={idea.hookIdea} />
                  <IdeaLine label="Estimated price" value={idea.estimatedPrice} />
                </div>

                <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", marginTop: "16px", fontSize: "13px", fontWeight: 600, color: "var(--color-primary)" }}>
                  Use this idea
                  <ArrowRight style={{ width: "14px", height: "14px" }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function IdeaLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: "0 0 3px", fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.55 }}>
        {value}
      </p>
    </div>
  );
}
