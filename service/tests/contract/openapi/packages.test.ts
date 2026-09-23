import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { getTestContext, closeTestContext } from "../../helpers/app.js";
import { tokenFor } from "../../helpers/tokens.js";

// Keep in sync with components.schemas.Package in openapi.yaml
const PACKAGE_FIELDS = ["id", "name", "description", "price"];

describe("Contract — /packages", () => {
  let app: any;
  const staff = randomUUID();

  let readToken: string;
  let writeToken: string;

  beforeAll(async () => {
    ({ app } = await getTestContext());
    readToken = await tokenFor(staff, { scopes: ["packages:read"] });
    writeToken = await tokenFor(staff, { scopes: ["packages:write"] });
  });

  afterAll(async () => {
    await closeTestContext();
  });

  it("GET /packages requires a token", async () => {
    const res = await request(app).get("/v1/packages");
    expect(res.status).toBe(401);
  });

  it("GET /packages returns an array whose items match the documented shape", async () => {
    const res = await request(app)
      .get("/v1/packages")
      .set("Authorization", `Bearer ${readToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const item of res.body) {
      // Fails if the representation leaks internal columns or omits a
      // documented field — either direction is a contract mismatch.
      expect(Object.keys(item).sort()).toEqual([...PACKAGE_FIELDS].sort());
    }
  });

  it("POST /packages refuses a valid token that lacks packages:write", async () => {
    const res = await request(app)
      .post("/v1/packages")
      .set("Authorization", `Bearer ${readToken}`)
      .send({ packageName: "x", packageDesc: "y", packagePrice: 1000 });
    expect(res.status).toBe(403);
    expect(res.headers["www-authenticate"]).toContain("insufficient_scope");
  });

  it("POST /packages with a missing required field returns 422, not 500", async () => {
    const res = await request(app)
      .post("/v1/packages")
      .set("Authorization", `Bearer ${writeToken}`)
      .send({ packageDesc: "no name given", packagePrice: 1000 });
    expect(res.status).toBe(422);
    expect(res.headers["content-type"]).toContain("application/problem+json");
  });

  it("POST /packages creates a package: 201, Location header, full representation", async () => {
    const res = await request(app)
      .post("/v1/packages")
      .set("Authorization", `Bearer ${writeToken}`)
      .send({
        packageName: "Contract Test Wash",
        packageDesc: "created by contract test",
        packagePrice: 12345,
      });

    expect(res.status).toBe(201);
    expect(res.headers.location).toContain(res.body.id);
    expect(Object.keys(res.body).sort()).toEqual([...PACKAGE_FIELDS].sort());
    expect(res.body.name).toBe("Contract Test Wash");
    expect(res.body.price).toBe(12345);
  });

  it("GET /packages/{packageId} for a nonexistent id returns 404 as Problem Details", async () => {
    const res = await request(app)
      .get(`/v1/packages/pkg_${randomUUID()}`)
      .set("Authorization", `Bearer ${readToken}`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("type");
    expect(res.body).toHaveProperty("title");
    expect(res.body).toHaveProperty("status", 404);
    expect(res.body).toHaveProperty("detail");
    expect(res.body).toHaveProperty("instance");
  });
});
