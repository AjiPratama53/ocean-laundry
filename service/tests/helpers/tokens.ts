import { createServer, type Server } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";

const ISSUER = "https://test.local/ocean-laundry";
const AUDIENCE = "ocean-laundry-api";

let jwksServer: Server | null = null;
let jwksUrl: string | null = null;
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let jwk: Record<string, unknown>;

/**
 * Starts a local HTTP server exposing a JWKS with a test-only signing key,
 * so the test suite can issue tokens the service will accept without any
 * network dependency on the real Keycloak instance. Idempotent — safe to
 * call multiple times.
 */
export async function startTestAuthServer(): Promise<{
  issuer: string;
  jwksUri: string;
  audience: string;
}> {
  if (jwksUrl) return { issuer: ISSUER, jwksUri: jwksUrl, audience: AUDIENCE };

  const { publicKey, privateKey: pk } = await generateKeyPair("RS256");
  privateKey = pk;
  jwk = { ...(await exportJWK(publicKey)), kid: "test-key", alg: "RS256", use: "sig" };

  jwksServer = createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ keys: [jwk] }));
  });

  await new Promise<void>((resolve) => jwksServer!.listen(0, "127.0.0.1", resolve));

  const address = jwksServer.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to determine test JWKS server address");
  }
  jwksUrl = `http://127.0.0.1:${address.port}/jwks.json`;
  return { issuer: ISSUER, jwksUri: jwksUrl, audience: AUDIENCE };
}

export async function stopTestAuthServer(): Promise<void> {
  if (jwksServer) {
    await new Promise<void>((resolve, reject) =>
      jwksServer!.close((err) => (err ? reject(err) : resolve())),
    );
    jwksServer = null;
    jwksUrl = null;
  }
}

export interface TokenOptions {
  scopes: string[];
  /** "service" makes principalFrom() classify this as a service account
   *  (azp === sub), matching how a real Client Credentials token looks. */
  kind?: "user" | "service";
}

export async function tokenFor(subject: string, opts: TokenOptions): Promise<string> {
  if (!privateKey) throw new Error("startTestAuthServer() must run before tokenFor()");
  const azp = opts.kind === "service" ? subject : "test-cli";
  return new SignJWT({ scope: opts.scopes.join(" "), azp })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}