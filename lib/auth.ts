import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase auth environment variables are missing.");
  }

  return { url, anonKey };
}

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "").trim();

  if (accessToken) {
    const { createSupabaseServiceClient } = await import("@/lib/supabase/service");
    const supabase = createSupabaseServiceClient();
    const {
      data: { user },
    } = await supabase.auth.getUser(accessToken);

    return user ?? null;
  }

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Route handlers authenticate from incoming cookies only.
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

export async function getUserFromProxy(
  request: NextRequest,
  response: NextResponse,
): Promise<User | null> {
  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

export function getRateLimitIdentifier(request: NextRequest, userId?: string | null) {
  if (userId) return `user:${userId}`;

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return `ip:${forwardedFor || realIp || "unknown"}`;
}
