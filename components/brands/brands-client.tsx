"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface BrandRecord {
  id: string;
  name: string;
  industry?: string | null;
  target_audience?: string | null;
  brand_voice?: string[] | null;
  approved_claims?: string[] | null;
  banned_phrases?: string[] | null;
  preferred_cta?: string | null;
  color_notes?: string | null;
}

const emptyForm = {
  name: "",
  industry: "",
  target_audience: "",
  brand_voice: "",
  approved_claims: "",
  banned_phrases: "",
  preferred_cta: "",
  color_notes: "",
};

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function BrandsClient() {
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [limit, setLimit] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadBrands() {
    const response = await fetch("/api/brands");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load brands.");
    setBrands(data.brands ?? []);
    setLimit(data.limit ?? 0);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBrands().catch((error) => setMessage(error instanceof Error ? error.message : "Could not load brands."));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function editBrand(brand: BrandRecord) {
    setEditingId(brand.id);
    setForm({
      name: brand.name ?? "",
      industry: brand.industry ?? "",
      target_audience: brand.target_audience ?? "",
      brand_voice: (brand.brand_voice ?? []).join(", "),
      approved_claims: (brand.approved_claims ?? []).join("\n"),
      banned_phrases: (brand.banned_phrases ?? []).join("\n"),
      preferred_cta: brand.preferred_cta ?? "",
      color_notes: brand.color_notes ?? "",
    });
  }

  async function saveBrand() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/brands", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name,
          industry: form.industry || undefined,
          target_audience: form.target_audience || undefined,
          brand_voice: splitLines(form.brand_voice),
          approved_claims: splitLines(form.approved_claims),
          banned_phrases: splitLines(form.banned_phrases),
          preferred_cta: form.preferred_cta || undefined,
          color_notes: form.color_notes || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save brand.");
      setForm(emptyForm);
      setEditingId(null);
      await loadBrands();
      setMessage("Brand profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save brand.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteBrand(id: string) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/brands/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete brand.");
      await loadBrands();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete brand.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F8FAFC", color: "#0F172A" }}>
      <header className="app-nav">
        <div className="app-nav-inner">
          <Link href="/" className="nav-logo">Cloud Nexus AI</Link>
          <Link href="/generate" style={{ fontSize: "13px", color: "var(--color-text-secondary)", fontWeight: 500 }}>
            Generate
          </Link>
        </div>
      </header>

      <section style={{ maxWidth: "1120px", margin: "0 auto", padding: "36px 20px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: "34px", lineHeight: 1.1 }}>Brand Profiles</h1>
            <p style={{ margin: 0, color: "#475569" }}>Store reusable audience, voice, claims, and CTA guidance.</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
            Add Brand Profile
          </button>
        </div>

        {limit === 0 && (
          <div style={{ marginBottom: "20px", border: "1px solid #BAE6FD", background: "#F0F9FF", color: "#075985", padding: "14px 16px", borderRadius: "8px", fontWeight: 700 }}>
            Upgrade to save brand profiles
          </div>
        )}

        {message && (
          <div role="status" style={{ marginBottom: "20px", border: "1px solid #CBD5E1", background: "white", padding: "12px 14px", borderRadius: "8px" }}>
            {message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.9fr) minmax(320px, 1.1fr)", gap: "20px" }} className="brands-layout">
          <div style={{ display: "grid", gap: "14px", alignSelf: "start" }}>
            {brands.map((brand) => (
              <article key={brand.id} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "18px" }}>
                <h2 style={{ margin: "0 0 6px", fontSize: "18px" }}>{brand.name}</h2>
                <p style={{ margin: "0 0 8px", color: "#64748B", fontSize: "13px" }}>{brand.industry || "No industry set"}</p>
                <p style={{ margin: "0 0 14px", color: "#334155", lineHeight: 1.5 }}>
                  {(brand.target_audience || "No audience saved yet.").slice(0, 150)}
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" className="btn-secondary" onClick={() => editBrand(brand)} disabled={busy}>Edit</button>
                  <button type="button" className="btn-ghost" onClick={() => void deleteBrand(brand.id)} disabled={busy}>Delete</button>
                </div>
              </article>
            ))}
            {brands.length === 0 && (
              <div style={{ background: "white", border: "1px dashed #CBD5E1", borderRadius: "8px", padding: "22px", color: "#64748B" }}>
                No brand profiles saved yet.
              </div>
            )}
          </div>

          <form style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "20px", display: "grid", gap: "14px" }} onSubmit={(event) => { event.preventDefault(); void saveBrand(); }}>
            <h2 style={{ margin: 0, fontSize: "20px" }}>{editingId ? "Edit Brand" : "Add Brand Profile"}</h2>
            <input className="input" placeholder="Brand name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <input className="input" placeholder="Industry" value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} />
            <textarea className="input" placeholder="Target audience" value={form.target_audience} onChange={(event) => setForm({ ...form, target_audience: event.target.value })} />
            <input className="input" placeholder="Brand voice, comma separated" value={form.brand_voice} onChange={(event) => setForm({ ...form, brand_voice: event.target.value })} />
            <textarea className="input" placeholder="Approved claims, one per line" value={form.approved_claims} onChange={(event) => setForm({ ...form, approved_claims: event.target.value })} />
            <textarea className="input" placeholder="Banned phrases, one per line" value={form.banned_phrases} onChange={(event) => setForm({ ...form, banned_phrases: event.target.value })} />
            <input className="input" placeholder="Preferred CTA" value={form.preferred_cta} onChange={(event) => setForm({ ...form, preferred_cta: event.target.value })} />
            <input className="input" placeholder="Color notes" value={form.color_notes} onChange={(event) => setForm({ ...form, color_notes: event.target.value })} />
            <button type="submit" className="btn-primary" disabled={busy || !form.name.trim()} style={{ justifyContent: "center" }}>
              {busy ? "Saving..." : "Save Brand"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
