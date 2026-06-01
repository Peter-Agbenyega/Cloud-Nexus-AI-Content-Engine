import { NextRequest, NextResponse } from "next/server";

import {
  formatZodErrors,
  GenerateSchema,
  prepareOfferForValidation,
  toOfferFormData,
} from "@/lib/api-schemas";
import { getRateLimitIdentifier, getUserFromRequest } from "@/lib/auth";
import { isStrategyBrief, validateNormalizedOfferData } from "@/lib/form";
import { parseRequestJson } from "@/lib/json";
import { generatePlatformPack } from "@/lib/openai";
import { checkRateLimit } from "@/lib/rate-limit";
import { GenerateRequestBody } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const rawBody = parseRequestJson<Record<string, unknown>>(await request.text());
    const parsed = GenerateSchema.safeParse({
      ...rawBody,
      offerData: prepareOfferForValidation(rawBody.offerData),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid generation request.",
          validationErrors: formatZodErrors(parsed.error),
        },
        { status: 400 },
      );
    }

    const user = await getUserFromRequest(request);
    const rateLimit = await checkRateLimit(getRateLimitIdentifier(request, user?.id));
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED", retryAfter: 60 },
        { status: 429 },
      );
    }

    const body: GenerateRequestBody = {
      offerData: toOfferFormData(parsed.data.offerData),
      strategyBrief: parsed.data.strategyBrief as unknown as GenerateRequestBody["strategyBrief"],
      platforms: parsed.data.platforms as unknown as GenerateRequestBody["platforms"],
    };

    const validationErrors = validateNormalizedOfferData({
      ...body.offerData,
      platforms: body.platforms,
    });
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors[0] },
        { status: 400 },
      );
    }

    if (!isStrategyBrief(body.strategyBrief)) {
      return NextResponse.json(
        { error: "Strategy brief is incomplete. Please regenerate strategy first." },
        { status: 400 },
      );
    }

    const { generatedContent, failedPlatforms } = await generatePlatformPack(body);

    return NextResponse.json({ generatedContent, failedPlatforms });
  } catch (error) {
    console.error("Generate route failed.", error);
    const message =
      error instanceof Error
        ? error.message
        : "Content generation failed. Please try again.";

    const status = message === "Request body is empty." || error instanceof SyntaxError ? 400 : 500;

    return NextResponse.json(
      {
        error:
          message || "Content generation failed. Please check your AI configuration.",
      },
      { status },
    );
  }
}
