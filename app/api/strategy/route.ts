import { NextRequest, NextResponse } from "next/server";

import {
  formatZodErrors,
  prepareOfferForValidation,
  StrategyRequestSchema,
  toOfferFormData,
} from "@/lib/api-schemas";
import { getRateLimitIdentifier, getUserFromRequest } from "@/lib/auth";
import { validateNormalizedOfferData } from "@/lib/form";
import { parseRequestJson } from "@/lib/json";
import { generateStrategyBrief } from "@/lib/openai";
import { checkRateLimit } from "@/lib/rate-limit";
import { StrategyRequestBody } from "@/lib/types";
import { checkCampaignLimit } from "@/lib/usage";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const rateLimit = await checkRateLimit(getRateLimitIdentifier(request, user.id));
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED", retryAfter: 60 },
        { status: 429 },
      );
    }

    const rawBody = parseRequestJson<Record<string, unknown>>(await request.text());
    const parsed = StrategyRequestSchema.safeParse({
      ...rawBody,
      offerData: prepareOfferForValidation(rawBody.offerData),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid strategy request.",
          validationErrors: formatZodErrors(parsed.error),
        },
        { status: 400 },
      );
    }

    const body: StrategyRequestBody = {
      offerData: toOfferFormData(parsed.data.offerData),
    };

    const campaignLimit = await checkCampaignLimit(user.id);
    if (!campaignLimit.allowed) {
      return NextResponse.json(
        {
          error: campaignLimit.reason,
          code: "LIMIT_REACHED",
          plan: campaignLimit.plan,
        },
        { status: 403 },
      );
    }

    const validationErrors = validateNormalizedOfferData(body.offerData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors[0] },
        { status: 400 },
      );
    }

    const strategyBrief = await generateStrategyBrief(body);

    return NextResponse.json({ strategyBrief });
  } catch (error) {
    console.error("Strategy route failed.", error);
    const message =
      error instanceof Error
        ? error.message
        : "Strategy generation failed. Please try again.";

    const status = message === "Request body is empty." || error instanceof SyntaxError ? 400 : 500;

    return NextResponse.json(
      {
        error:
          message || "Strategy generation failed. Please check your API setup.",
      },
      { status },
    );
  }
}
