import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth";
import { PLANS, getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

const CheckoutSchema = z.object({
  planKey: z.enum(["starter", "pro", "agency"]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const parsed = CheckoutSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout request.", validationErrors: parsed.error.issues },
        { status: 400 },
      );
    }

    const plan = PLANS[parsed.data.planKey];
    if (!plan.priceId) {
      return NextResponse.json(
        { error: "This plan is not configured for checkout." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id as string | null | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      metadata: { userId: user.id, planKey: parsed.data.planKey },
      subscription_data: {
        metadata: { userId: user.id, planKey: parsed.data.planKey },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout route failed.", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed." },
      { status: 500 },
    );
  }
}
