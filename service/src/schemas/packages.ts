import { z } from "zod";

export const packageIdParamSchema = z.object({
  packageId: z.string().min(1), // contract only says type: string, nothing more to enforce
});

export const getPackagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const createPackageSchema = z.object({
  name: z.string().min(1, "name required"),
  price: z.number().min(0, "price must be non-negative"),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
