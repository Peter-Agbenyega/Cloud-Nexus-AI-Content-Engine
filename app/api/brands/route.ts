import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

const BrandSchema = z.object({
  name: z.string().min(1).max(100),
  industry: z.string().max(100).optional(),
  target_audience: z.string().max(500).optional(),
  brand_voice: z.array(z.string()).max(10).optional(),
  approved_claims: z.array(z.string()).max(20).optional(),
  banned_phrases: z.array(z.string()).max(20).optional(),
  preferred_cta: z.string().max(50).optional(),
  color_notes: z.string().max(200).optional(),
});

const UpdateBrandSchema = BrandSchema.extend({
  id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();
    const plan = (profile?.plan ?? "free") as PlanKey;

    return NextResponse.json({
      brands: data ?? [],
      plan,
      limit: (PLANS[plan] ?? PLANS.free).brandProfiles,
    });
  } catch (error) {
    console.error("Brands GET failed.", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load brands." },
      { status: 500 },
    );
  }
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

    const parsed = BrandSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid brand profile.", validationErrors: parsed.error.issues },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();
    const plan = (profile?.plan ?? "free") as PlanKey;
    const limit: number = (PLANS[plan] ?? PLANS.free).brandProfiles;

    const { count } = await supabase
      .from("brands")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (limit !== -1 && (count ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: "Upgrade to save more brand profiles.",
          code: "LIMIT_REACHED",
          plan,
          limit,
        },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("brands")
      .insert({
        ...parsed.data,
        user_id: user.id,
      })
      .select("*")
      .single();

    if (error || !data) throw error ?? new Error("Brand profile could not be saved.");

    return NextResponse.json({ brand: data });
  } catch (error) {
    console.error("Brands POST failed.", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save brand." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const parsed = UpdateBrandSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid brand profile.", validationErrors: parsed.error.issues },
        { status: 400 },
      );
    }

    const { id, ...updates } = parsed.data;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("brands")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) throw error ?? new Error("Brand profile could not be updated.");

    return NextResponse.json({ brand: data });
  } catch (error) {
    console.error("Brands PUT failed.", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update brand." },
      { status: 500 },
    );
  }
}
