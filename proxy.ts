import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy (Next.js 16): TLS e HSTS em produção (11.2.1/12.3).
 *
 * O HSTS é aplicado aqui — e não apenas em `next.config.ts` — para que também
 * esteja presente nas respostas de redirecionamento HTTP→HTTPS geradas pelo
 * próprio proxy. A configuração de cabeçalhos foi deduplicada para não emitir
 * a diretiva duas vezes. Em desenvolvimento nada é redirecionado, preservando
 * o uso normal de `http://localhost`.
 */
const HSTS_VALUE = "max-age=63072000; includeSubDomains";

function withHsts(response: NextResponse): NextResponse {
  if (!response.headers.has("Strict-Transport-Security")) {
    response.headers.set("Strict-Transport-Security", HSTS_VALUE);
  }
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  // O reverse proxy informa o protocolo original em x-forwarded-proto; quando
  // a requisição chega em HTTP, redireciona para a mesma URL em HTTPS.
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
  // Todas as respostas (páginas, API e estáticos) recebem HSTS em produção.
  matcher: ["/:path*"],
};
