import type { NextRequest } from "next/server";

export function getClientIp(request: Request | NextRequest): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function getUserAgent(request: Request | NextRequest): string {
  return request.headers.get("user-agent")?.slice(0, 500) ?? "unknown";
}

export function isSameOrigin(request: Request | NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
