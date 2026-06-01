import { PricingClient } from "@/components/pricing/pricing-client";
import { PLANS } from "@/lib/stripe";

const prices = {
  free: "$0",
  starter: "$19",
  pro: "$49",
  agency: "$149",
} as const;

export default function PricingPage() {
  const plans = (["free", "starter", "pro", "agency"] as const).map((key) => ({
    key,
    name: PLANS[key].name,
    price: prices[key],
    features: [...PLANS[key].features],
    popular: key === "pro",
  }));

  return <PricingClient plans={plans} />;
}
