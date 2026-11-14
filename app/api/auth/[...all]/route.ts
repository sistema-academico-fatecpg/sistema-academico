import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const GET = toNextJsHandler(auth.handler);
export const POST = toNextJsHandler(auth.handler);
export const PUT = toNextJsHandler(auth.handler);
export const PATCH = toNextJsHandler(auth.handler);
export const DELETE = toNextJsHandler(auth.handler);
export const OPTIONS = toNextJsHandler(auth.handler);
