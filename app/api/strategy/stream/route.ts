import { NextRequest } from "next/server";

import {
  formatZodErrors,
  prepareOfferForValidation,
  StrategyRequestSchema,
  toOfferFormData,
} from "@/lib/api-schemas";
import { getRateLimitIdentifier, getUserFromRequest } from "@/lib/auth";
import { buildStrategyPrompt, streamOpenAI } from "@/lib/openai";
import { checkRateLimit } from "@/lib/rate-limit";
import { STRATEGY_SYSTEM_PROMPT } from "@/lib/constants";
import { checkCampaignLimit } from "@/lib/usage";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    const rateLimit = await checkRateLimit(getRateLimitIdentifier(request, user?.id));
    if (!rateLimit.success) {
      return Response.json(
        { error: "Too many requests", code: "RATE_LIMITED", retryAfter: 60 },
        { status: 429 },
      );
    }

    const rawBody = JSON.parse(await request.text()) as Record<string, unknown>;
    const parsed = StrategyRequestSchema.safeParse({
      ...rawBody,
      offerData: prepareOfferForValidation(rawBody.offerData),
    });

    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid strategy request.",
          validationErrors: formatZodErrors(parsed.error),
        },
        { status: 400 },
      );
    }

    const offerData = toOfferFormData(parsed.data.offerData);
    if (user) {
      const campaignLimit = await checkCampaignLimit(user.id);
      if (!campaignLimit.allowed) {
        return Response.json(
          {
            error: campaignLimit.reason,
            code: "LIMIT_REACHED",
            plan: campaignLimit.plan,
          },
          { status: 403 },
        );
      }
    }

    const stream = await streamOpenAI(
      STRATEGY_SYSTEM_PROMPT,
      buildStrategyPrompt(offerData),
      900,
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Strategy stream route failed.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Strategy stream failed." },
      { status: 500 },
    );
  }
}
