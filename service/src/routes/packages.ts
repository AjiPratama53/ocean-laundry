import { Router } from "express";

import type { Request, Response } from "express";
import { toPackageResponse } from "../representations/packages";
import { findPackageById, findPackages } from "../store/packages";
import { packageIdParamSchema } from "../schemas/packages";
import { problem } from "../problem";

export const packagesRouter = Router();

// GET /v1/packages/{packageId}
packagesRouter.get(
  "/packages/:packageId",
  async (req: Request, res: Response) => {
    // 2. Validation
    const parsed = packageIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(problem(400, "Invalid package id", req.originalUrl));
    }

    // 3. Work
    const row = await findPackageById(parsed.data.packageId);
    if (!row) {
      return res
        .status(404)
        .json(problem(404, "Package not found", req.originalUrl));
    }

    // 4. Representation + 5. Response
    return res.status(200).json(toPackageResponse(row));
  },
);

// GET /v1/packages
packagesRouter.get("/packages", async (req: Request, res: Response) => {
  // 2. Work
  const rows = await findPackages({
    limit: 20, // default limit
  });

  // 3. Representation + 4. Response
  return res.status(200).json(rows.map(toPackageResponse));
});

// POST /v1/packages

// PATCH /v1/packages/{packageId}
