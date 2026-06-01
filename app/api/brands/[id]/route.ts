import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/brands/[id]">,
) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Brand DELETE failed.", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete brand." },
      { status: 500 },
    );
  }
}
