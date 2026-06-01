import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripe, type PlanKey } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

function isPlanKey(value: unknown): value is PlanKey {
  return value === "starter" || value === "pro" || value === "agency";
}

async function findPlanForSubscription(subscription: Stripe.Subscription): Promise<PlanKey | "free"> {
  const metadataPlan = subscription.metadata.planKey;
  if (isPlanKey(metadataPlan)) return metadataPlan;
  return "free";
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe webhook signature or secret." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed.", error);
    return NextResponse.json(
      { error: "Invalid Stripe webhook signature." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planKey = session.metadata?.planKey;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (userId && isPlanKey(planKey) && customerId) {
        await supabase
          .from("users")
          .update({
            plan: planKey,
            stripe_customer_id: customerId,
            campaigns_this_month: 0,
          })
          .eq("id", userId);
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const plan = await findPlanForSubscription(subscription);
      const nextPlan =
        subscription.status === "active" ? plan : "free";

      await supabase
        .from("users")
        .update({ plan: nextPlan })
        .eq("stripe_customer_id", customerId);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await supabase
        .from("users")
        .update({ plan: "free", stripe_customer_id: null })
        .eq("stripe_customer_id", customerId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler failed.", error);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 },
    );
  }
}
