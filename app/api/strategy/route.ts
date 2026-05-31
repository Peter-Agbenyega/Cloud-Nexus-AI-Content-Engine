import { NextResponse } from "next/server";

import { validateNormalizedOfferData } from "@/lib/form";
import { parseRequestJson } from "@/lib/json";
import { generateStrategyBrief } from "@/lib/openai";
import { StrategyRequestBody } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = parseRequestJson<StrategyRequestBody>(await request.text());

    if (!body.offerData) {
      return NextResponse.json(
        { error: "Offer data is required to build the strategy brief." },
        { status: 400 },
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
