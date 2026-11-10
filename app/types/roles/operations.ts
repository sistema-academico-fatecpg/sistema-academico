import { z } from "zod";

/**
 * Operações disponíveis para autorização.
 */
export const Operation = z.enum(["READ", "SAVE", "REMOVE"]);

export type Operation = z.infer<typeof Operation>;
