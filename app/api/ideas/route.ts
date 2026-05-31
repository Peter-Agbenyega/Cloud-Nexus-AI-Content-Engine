import { NextResponse, type NextRequest } from "next/server";

import { generateProductIdeas } from "@/lib/openai";
import { type OfferCategory } from "@/lib/types";

function parseCategory(value: string | null): OfferCategory | null {
  if (
    value === "Physical Product" ||
    value === "Digital Product" ||
    value === "Service" ||
    value === "SaaS" ||
    value === "Course"
  ) {
    return value;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const category = parseCategory(request.nextUrl.searchParams.get("category"));
    const payload = await generateProductIdeas(category);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Ideas route failed.", error);

    const message = error instanceof Error
      ? error.message
      : "Product idea generation failed. Please try again.";

    return NextResponse.json(
      { error: message || "Product idea generation failed." },
      { status: 500 },
    );
  }
}
