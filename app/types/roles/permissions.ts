import { z } from "zod";

/**
 * Permissões disponíveis no sistema.
 *
 * Cada permissão representa uma operação específica
 * sobre determinado módulo.
 */
export const Permission = z.enum([
  "USERS:READ",
  "USERS:SAVE",
  "USERS:REMOVE",

  "GRADES:READ",
  "GRADES:SAVE",

  "ENROLLMENTS:READ",
  "ENROLLMENTS:SAVE",

  "LOGS:READ",

  "PERIODS:READ",
  "PERIODS:SAVE",

  "CRITICAL_OPERATIONS:READ",
  "CRITICAL_OPERATIONS:SAVE",
]);

export type Permission = z.infer<typeof Permission>;
