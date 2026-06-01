import { createServiceClient } from "@/lib/supabase/service";
import { PLANS, type PlanKey } from "@/lib/stripe";

export async function checkCampaignLimit(
  userId: string,
): Promise<{ allowed: boolean; reason?: string; plan: PlanKey }> {
  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("plan, campaigns_this_month, last_reset_date")
    .eq("id", userId)
    .single();

  if (!user) {
    return { allowed: false, reason: "User not found", plan: "free" };
  }

  const plan = (user.plan ?? "free") as PlanKey;
  const planConfig = PLANS[plan] ?? PLANS.free;

  const now = new Date();
  const lastReset = user.last_reset_date
    ? new Date(user.last_reset_date)
    : null;

  if (
    !lastReset ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear()
  ) {
    await supabase
      .from("users")
      .update({
        campaigns_this_month: 0,
        last_reset_date: now.toISOString().split("T")[0],
      })
      .eq("id", userId);

    return { allowed: true, plan };
  }

  if (planConfig.campaignsPerMonth === -1) {
    return { allowed: true, plan };
  }

  if ((user.campaigns_this_month ?? 0) >= planConfig.campaignsPerMonth) {
    return {
      allowed: false,
      reason: `You have used all ${planConfig.campaignsPerMonth} campaigns this month. Upgrade to generate more.`,
      plan,
    };
  }

  return { allowed: true, plan };
}

export async function incrementCampaignCount(userId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.rpc("increment_campaign_count", { user_id: userId });
}
