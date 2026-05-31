import { NextResponse } from "next/server";

import { parseRequestJson } from "@/lib/json";
import { generateAssistDraft } from "@/lib/openai";
import { AssistRequestBody } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = parseRequestJson<AssistRequestBody>(await request.text());

    if (!body.offerData || (body.mode !== "draft" && body.mode !== "full")) {
      return NextResponse.json(
        { error: "Assist mode and offer data are required." },
        { status: 400 },
      );
    }

    const response = await generateAssistDraft(body);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Assist route failed.", error);

    const message = error instanceof Error
      ? error.message
      : "Assist generation failed. Please try again.";

    const status = message === "Request body is empty." || error instanceof SyntaxError ? 400 : 500;

    return NextResponse.json(
      { error: message || "Assist generation failed." },
      { status },
    );
  }
}
