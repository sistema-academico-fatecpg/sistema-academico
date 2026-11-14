import { type JwtPayload, sign, verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";

export interface TokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export async function signToken(payload: Omit<TokenPayload, "iat" | "exp">): Promise<string> {
  return new Promise((resolve, reject) => {
    sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any, (err, token) => {
      if (err) reject(err);
      else resolve(token as string);
    });
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
