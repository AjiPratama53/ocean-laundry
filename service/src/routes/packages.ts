import { Router } from "express";
import { requireScope } from "../auth/require-scope.js";
import type { Request, Response } from "express";
import { toPackageResponse } from "../representations/packages.js";
import {
  findPackageById,
  findPackages,
  createPackage,
  updatePackage,
  deletePackage,
} from "../store/packages.js";
import {
  createPackageSchema,
  packageIdParamSchema,
} from "../schemas/packages.js";
import { problem, sendProblem } from "../problem.js";
import {
  checkPrecondition,
  etagFor,
  invalidParams,
  sendConditional,
} from "../middleware/http-cache.js";

export const packagesRouter = Router();

// GET /v1/packages/{packageId}
packagesRouter.get(
  "/packages/:packageId",
  requireScope("packages:read"),
  async (req: Request, res: Response) => {
    // 2. Validation
    const parsed = packageIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(
            400,
            "validation-error",
            "Invalid package id",
            req.originalUrl,
            invalidParams(parsed.error.issues),
          ),
        );
    }

    // 3. Work
    const row = await findPackageById(parsed.data.packageId);
    if (!row) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Package not found", req.originalUrl));
    }

    // 4. Representation + 5. Response (conditional read, A.7)
    const body = toPackageResponse(row);
    sendConditional(req, res, body, etagFor(row));
    return;
  },
);

// GET /v1/packages
packagesRouter.get(
  "/packages", 
  requireScope("packages:read"),
  async (_req: Request, res: Response) => {
    // 2. Work
    const rows = await findPackages({
      limit: 20, // default limit
    });

    // 3. Representation + 4. Response (conditional read, A.7)
    const body = rows.map(toPackageResponse);
    sendConditional(_req, res, body, etagFor(body));
    return;
  }
);

// POST /v1/packages
packagesRouter.post(
  "/packages", 
  requireScope("packages:write"),
  async (req: Request, res: Response) => {
    // 2. Validation
    const parsed = createPackageSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendProblem(res, 422, "validation-error", "Invalid package data", req.originalUrl,
        invalidParams(parsed.error.issues));
    }

    // 3. Work
    try {
      const row = await createPackage(parsed.data);
      // 4. Representation + 5. Response
      res.setHeader("Location", `/v1/packages/${row.id}`);
      res.setHeader("ETag", etagFor(row));
      return res.status(201).json(toPackageResponse(row));
    } catch (error) {
      req.log.error({ err: error }, "Error creating package");
      return res
        .status(500)
        .json(
          problem(
            500,
            "internal-server-error",
            "Internal server error",
            req.originalUrl,
          ),
        );
    }
  }
);

// PATCH /v1/packages/{packageId}
packagesRouter.patch(
  "/packages/:packageId",
  requireScope("packages:write"),
  async (req: Request, res: Response) => {
    // 2. Validation
    const parsed = packageIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(
            400,
            "validation-error",
            "Invalid package id",
            req.originalUrl,
            invalidParams(parsed.error.issues),
          ),
        );
    }

    const { packageName, packagePrice } = req.body;
    if (packageName === undefined && packagePrice === undefined) {
      return res
        .status(400)
        .json(
          problem(
            400,
            "validation-error",
            "No fields to update",
            req.originalUrl,
          ),
        );
    }

    // 3. Work
    try {
      const current = await findPackageById(parsed.data.packageId);
      if (!current) {
        return res
          .status(404)
          .json(
            problem(404, "not-found", "Package not found", req.originalUrl),
          );
      }
      // Conditional write (A.8): refuse stale preconditions with 412.
      if (checkPrecondition(req, res, etagFor(current))) return;

      const row = await updatePackage(parsed.data.packageId, {
        name: packageName,
        price: packagePrice,
      });
      if (!row) {
        return res
          .status(404)
          .json(
            problem(404, "not-found", "Package not found", req.originalUrl),
          );
      }

      // 4. Representation + 5. Response
      res.setHeader("ETag", etagFor(row));
      return res.status(200).json(toPackageResponse(row));
    } catch (error) {
      req.log.error({ err: error }, "Error updating package");
      return res
        .status(500)
        .json(
          problem(
            500,
            "internal-server-error",
            "Internal server error",
            req.originalUrl,
          ),
        );
    }
  },
);

// DELETE /v1/packages/{packageId}
packagesRouter.delete(
  "/packages/:packageId",
  requireScope("packages:write"),
  async (req: Request, res: Response) => {
    // 2. Validation
    const parsed = packageIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(
            400,
            "validation-error",
            "Invalid package id",
            req.originalUrl,
            invalidParams(parsed.error.issues),
          ),
        );
    }

    // 3. Work (conditional write, A.8)
    const current = await findPackageById(parsed.data.packageId);
    if (!current) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Package not found", req.originalUrl));
    }
    if (checkPrecondition(req, res, etagFor(current))) return;

    const row = await deletePackage(parsed.data.packageId);
    if (!row) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Package not found", req.originalUrl));
    }

    // 4. Representation + 5. Response
    return res.status(200).json(toPackageResponse(row));
  },
);
