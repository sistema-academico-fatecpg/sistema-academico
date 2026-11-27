import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  // 12.3: cabeçalhos de defesa em profundidade (XSS/clickjacking/MITM).
  // O TLS 1.2+ e o HSTS efetivo dependem do proxy reverso em produção (11.2.1).
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
