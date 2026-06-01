import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-01-27.acacia" as never,
      typescript: true,
    });
  }

  return stripeClient;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

export const PLANS = {
  free: {
    name: "Free",
    priceId: null,
    campaignsPerMonth: 3,
    platformsPerCampaign: 2,
    brandProfiles: 0,
    features: [
      "3 campaigns per month",
      "2 platforms per campaign",
      "Basic text export",
      "Campaign history (7 days)",
    ],
  },
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    campaignsPerMonth: 15,
    platformsPerCampaign: 8,
    brandProfiles: 1,
    features: [
      "15 campaigns per month",
      "All 8 platforms",
      "1 brand profile",
      "All export formats",
      "Commerce scoring",
      "Campaign history (90 days)",
    ],
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    campaignsPerMonth: -1,
    platformsPerCampaign: 8,
    brandProfiles: 5,
    features: [
      "Unlimited campaigns",
      "All 8 platforms",
      "5 brand profiles",
      "All export formats",
      "30-day content calendar",
      "Priority generation",
      "Unlimited history",
    ],
  },
  agency: {
    name: "Agency",
    priceId: process.env.STRIPE_AGENCY_PRICE_ID ?? "",
    campaignsPerMonth: -1,
    platformsPerCampaign: 8,
    brandProfiles: 25,
    features: [
      "Everything in Pro",
      "25 brand profiles",
      "White-label exports",
      "3 team seats",
      "Client workspaces",
      "Bulk generation",
      "API access",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
