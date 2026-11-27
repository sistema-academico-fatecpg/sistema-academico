import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy (Next.js 16): TLS e HSTS apenas em produção real (11.2.1/12.3).
 *
 * `NODE_ENV` é "production" também no build usado pelo docker-compose local,
 * então ele NÃO pode decidir o redirecionamento. A decisão usa APP_ENV e a
 * URL pública configurada. Hosts locais nunca são redirecionados nem recebem
 * HSTS — isso evita ERR_SSL_PROTOCOL_ERROR em http://localhost:3000.
 */
const HSTS_VALUE = "max-age=63072000; includeSubDomains";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function shouldEnforceHttps(
  hostname: string,
  appEnv = process.env.APP_ENV,
  baseUrl = process.env.BETTER_AUTH_URL,
): boolean {
  if (appEnv?.trim().toLowerCase() !== "production") return false;
  if (!baseUrl?.trim().toLowerCase().startsWith("https://")) return false;
  return !LOCAL_HOSTS.has(hostname.toLowerCase());
}

function withHsts(response: NextResponse): NextResponse {
  if (!response.headers.has("Strict-Transport-Security")) {
    response.headers.set("Strict-Transport-Security", HSTS_VALUE);
  }
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const hostname = request.nextUrl.hostname;
  if (!shouldEnforceHttps(hostname)) return NextResponse.next();

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProto === "http") {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https";
    return withHsts(NextResponse.redirect(httpsUrl));
  }

  return withHsts(NextResponse.next());
}

export const config = {
  matcher: ["/:path*"],
};
