import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth";
import {
  extractAudienceSignal,
  extractBenefits,
  extractPrice,
  extractSocialProof,
  inferCategory,
} from "@/lib/url-extract";

const ExtractUrlSchema = z.object({
  url: z.string().url(),
});

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") {
    return true;
  }

  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) {
    return true;
  }

  const private172 = host.match(/^172\.(\d{1,2})\./);
  if (private172) {
    const secondOctet = Number(private172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function firstText(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const parsed = ExtractUrlSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter a valid public URL.", extracted: null },
        { status: 400 },
      );
    }

    const target = new URL(parsed.data.url);

    if (!["http:", "https:"].includes(target.protocol) || isBlockedHost(target.hostname)) {
      return NextResponse.json(
        { error: "Enter a public product URL.", extracted: null },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await fetch(target.toString(), {
        signal: controller.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; CloudNexusAIStudio/1.0; +https://cloudnexus.ai)",
          accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not access URL", extracted: null },
        { status: 400 },
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();

    const title = firstText(
      $("meta[property='og:title']").attr("content"),
      $("title").first().text(),
      $("h1").first().text(),
    );
    const description = firstText(
      $("meta[name='description']").attr("content"),
      $("meta[property='og:description']").attr("content"),
      $("main p").first().text(),
      $("p").first().text(),
    );
    const bulletText = $("main li, [class*='feature'] li, [class*='benefit'] li")
      .map((_, element) => $(element).text().trim())
      .get()
      .filter(Boolean)
      .join("\n");
    const pageText = $("body").text().replace(/\s+/g, " ").trim();
    const combinedText = `${description}\n${bulletText}\n${pageText}`;
    const benefits = [
      ...extractBenefits(bulletText),
      ...extractBenefits(combinedText),
    ].slice(0, 5);

    const extracted = {
      sourceUrl: target.toString(),
      offerName: title,
      description,
      price: extractPrice(pageText).replace(/[^0-9.,]/g, "").replace(",", "."),
      benefits: Array.from(new Set(benefits)).slice(0, 3),
      targetAudience: extractAudienceSignal(pageText),
      painPoint: description
        ? `They want ${description.toLowerCase().replace(/\.$/, "")}, but need a clear reason to trust this offer.`
        : "",
      socialProof: extractSocialProof(pageText),
      category: inferCategory(target.toString(), pageText),
    };

    if (!extracted.offerName && !extracted.description) {
      return NextResponse.json(
        { error: "Could not extract product details from this page.", extracted: null },
        { status: 400 },
      );
    }

    return NextResponse.json({ extracted });
  } catch (error) {
    console.error("URL extraction failed.", error);
    return NextResponse.json(
      { error: "Could not access URL", extracted: null },
      { status: 400 },
    );
  }
}
