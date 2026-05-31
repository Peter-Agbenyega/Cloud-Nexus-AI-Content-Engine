import { NextRequest, NextResponse } from "next/server";

import { isStrategyBrief, validateNormalizedOfferData } from "@/lib/form";
import { parseRequestJson } from "@/lib/json";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SaveCampaignRequestBody } from "@/lib/types";

async function getAuthenticatedUserId(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "").trim();

  if (!accessToken) {
    return null;
  }

  const supabase = createSupabaseServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken);

  return user?.id ?? null;
}

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

    const userId = await getAuthenticatedUserId(request);
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
    const body = parseRequestJson<SaveCampaignRequestBody>(await request.text());
    const supabase = createSupabaseServiceClient();
    const userId = await getAuthenticatedUserId(request);

    if (
      !body.offerData ||
      !body.strategyBrief ||
      !body.generatedContent ||
      !body.commerceScores
    ) {
      return NextResponse.json(
        { error: "Incomplete campaign payload." },
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
