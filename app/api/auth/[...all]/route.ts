import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/app/lib/auth/better-auth";

export const { GET, POST } = toNextJsHandler(auth);
