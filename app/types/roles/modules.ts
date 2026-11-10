import { z } from "zod";

/**
 * Módulos protegidos do sistema.
 */
export const Module = z.enum([
  "USERS",
  "GRADES",
  "ENROLLMENTS",
  "LOGS",
  "PERIODS",
  "CRITICAL_OPERATIONS",
  "EXPORT",
]);

export type Module = z.infer<typeof Module>;
