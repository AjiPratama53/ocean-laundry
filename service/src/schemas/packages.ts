import { z } from "zod";

export const packageIdParamSchema = z.object({
  packageId: z.string().min(1), // contract only says type: string, nothing more to enforce
});

export const getPackagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
