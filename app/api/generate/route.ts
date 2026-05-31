import { NextResponse } from "next/server";

import { isStrategyBrief, validateNormalizedOfferData } from "@/lib/form";
import { parseRequestJson } from "@/lib/json";
import { generatePlatformPack } from "@/lib/openai";
import { GenerateRequestBody } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = parseRequestJson<GenerateRequestBody>(await request.text());

    if (!body.offerData || !body.strategyBrief || !body.platforms?.length) {
      return NextResponse.json(
        { error: "Offer data, strategy brief, and selected platforms are required." },
        { status: 400 },
      );
    }

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
