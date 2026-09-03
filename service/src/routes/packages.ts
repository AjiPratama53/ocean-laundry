import { Router } from "express";

import type { Request, Response } from "express";
import { toPackageResponse } from "../representations/packages";
import {
  findPackageById,
  findPackages,
  createPackage,
  updatePackage,
} from "../store/packages";
import { createPackageSchema, packageIdParamSchema } from "../schemas/packages";
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
        .json(problem(400, "validation-error", "Invalid package id", req.originalUrl));
    }

    // 3. Work
    const row = await findPackageById(parsed.data.packageId);
    if (!row) {
      return res
        .status(404)
        .json(problem(404, "not-found" ,"Package not found", req.originalUrl));
    }

    // 4. Representation + 5. Response
    return res.status(200).json(toPackageResponse(row));
  },
);

// GET /v1/packages
packagesRouter.get("/packages", async (_req: Request, res: Response) => {
  // 2. Work
  const rows = await findPackages({
    limit: 20, // default limit
  });

  // 3. Representation + 4. Response
  return res.status(200).json(rows.map(toPackageResponse));
});

// POST /v1/packages
packagesRouter.post("/packages", async (req: Request, res: Response) => {
  // 2. Validation
  const parsed = createPackageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(problem(400, "validation-error", "Invalid package data", req.originalUrl));
  }

  // 3. Work
  try {
    const row = await createPackage(parsed.data);
    // 4. Representation + 5. Response
    return res.status(201).json(toPackageResponse(row));
  } catch (error) {
    console.error("Error creating package:", error);
    return res
      .status(500)
      .json(problem(500, "internal-server-error", "Internal server error", req.originalUrl));
  }
});

// PATCH /v1/packages/{packageId}
packagesRouter.patch(
  "/packages/:packageId",
  async (req: Request, res: Response) => {
    // 2. Validation
    const parsed = packageIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(problem(400, "validation-error", "Invalid package id", req.originalUrl));
    }

    const { packageName, packagePrice } = req.body;
    if (packageName === undefined && packagePrice === undefined) {
      return res
        .status(400)
        .json(problem(400, "validation-error", "No fields to update", req.originalUrl));
    }

    // 3. Work
    try {
      const row = await updatePackage(parsed.data.packageId, {
        name: packageName,
        price: packagePrice,
      });
      if (!row) {
        return res
          .status(404)
          .json(problem(404, "not-found", "Package not found", req.originalUrl));
      }

      // 4. Representation + 5. Response
      return res.status(200).json(toPackageResponse(row));
    } catch (error) {
      console.error("Error updating package:", error);
      return res
        .status(500)
        .json(problem(500, "internal-server-error", "Internal server error", req.originalUrl));
    }
  },
);
