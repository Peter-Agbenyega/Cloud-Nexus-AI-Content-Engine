import { NextRequest, NextResponse } from "next/server";

import {
  formatZodErrors,
  prepareOfferForValidation,
  SaveCampaignSchema,
  StrategySchema,
  toOfferFormData,
} from "@/lib/api-schemas";
import { getUserFromRequest } from "@/lib/auth";
import { isStrategyBrief, validateNormalizedOfferData } from "@/lib/form";
import { parseRequestJson } from "@/lib/json";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SaveCampaignRequestBody } from "@/lib/types";
import { incrementCampaignCount } from "@/lib/usage";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const campaignId = request.nextUrl.searchParams.get("id");

    if (campaignId) {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Campaign not found." },
          { status: 404 },
        );
      }

      return NextResponse.json({ campaign: data });
    }

    const user = await getUserFromRequest(request);
    const userId = user?.id ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication is required to load dashboard campaigns." },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ campaigns: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load campaigns right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = parseRequestJson<Record<string, unknown>>(await request.text());
    const supabase = createSupabaseServiceClient();
    const user = await getUserFromRequest(request);
    const userId = user?.id ?? null;

    const legacyBody = rawBody as Partial<SaveCampaignRequestBody> & Record<string, unknown>;
    const offerData = legacyBody.offerData ?? rawBody.offer_data;
    const parsedOffer = StrategySchema.safeParse(prepareOfferForValidation(offerData));

    if (!parsedOffer.success) {
      return NextResponse.json(
        {
          error: "Invalid campaign offer data.",
          validationErrors: formatZodErrors(parsedOffer.error),
        },
        { status: 400 },
      );
    }

    const normalizedCampaign = {
      id: legacyBody.campaignId ?? rawBody.id,
      title: rawBody.title ?? toOfferFormData(parsedOffer.data).offerName,
      offer_data: toOfferFormData(parsedOffer.data),
      strategy_brief: legacyBody.strategyBrief ?? rawBody.strategy_brief,
      generated_content: legacyBody.generatedContent ?? rawBody.generated_content,
      commerce_scores: legacyBody.commerceScores ?? rawBody.commerce_scores,
      platforms: rawBody.platforms,
    };

    const parsed = SaveCampaignSchema.safeParse(normalizedCampaign);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid campaign payload.",
          validationErrors: formatZodErrors(parsed.error),
        },
        { status: 400 },
      );
    }

    if (
      !parsed.data.strategy_brief ||
      !parsed.data.generated_content ||
      !parsed.data.commerce_scores
    ) {
      return NextResponse.json(
        { error: "Incomplete campaign payload." },
        { status: 400 },
      );
    }

    const body: SaveCampaignRequestBody = {
      campaignId: parsed.data.id,
      offerData: parsed.data.offer_data as unknown as SaveCampaignRequestBody["offerData"],
      strategyBrief: parsed.data.strategy_brief as unknown as SaveCampaignRequestBody["strategyBrief"],
      generatedContent: parsed.data.generated_content as unknown as SaveCampaignRequestBody["generatedContent"],
      commerceScores: parsed.data.commerce_scores as unknown as SaveCampaignRequestBody["commerceScores"],
    };

    const validationErrors = validateNormalizedOfferData(body.offerData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors[0] },
        { status: 400 },
      );
    }

    if (!isStrategyBrief(body.strategyBrief)) {
      return NextResponse.json(
        { error: "Strategy brief is incomplete." },
        { status: 400 },
      );
    }

    if (Object.keys(body.generatedContent).length === 0) {
      return NextResponse.json(
        { error: "At least one generated content section is required." },
        { status: 400 },
      );
    }

    if (body.campaignId) {
      const { data, error } = await supabase
        .from("campaigns")
        .update({
          user_id: userId,
          title: body.offerData.offerName,
          offer_data: body.offerData,
          strategy_brief: body.strategyBrief,
          generated_content: body.generatedContent,
          commerce_scores: body.commerceScores,
        })
        .eq("id", body.campaignId)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Campaign could not be updated.");
      }

      return NextResponse.json({ campaign: data });
    }

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        title: body.offerData.offerName,
        offer_data: body.offerData,
        strategy_brief: body.strategyBrief,
        generated_content: body.generatedContent,
        commerce_scores: body.commerceScores,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Campaign could not be saved.");
    }

    if (userId) {
      await incrementCampaignCount(userId);
    }

    return NextResponse.json({ campaign: data });
  } catch (error) {
    console.error("Campaign save route failed.", error);
    const message =
      error instanceof Error ? error.message : "Campaign save failed.";

    const status = message === "Request body is empty." || error instanceof SyntaxError ? 400 : 500;

    return NextResponse.json(
      {
        error:
          message || "Campaign save failed. Please verify your Supabase setup.",
      },
      { status },
    );
  }
}
