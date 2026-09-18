import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js'; // ??

// Public keys are fetched once and cached; do not build a new JWKSet per
// request, because that means one outbound HTTP call per API request.
const jwks = createRemoteJWKSet(new URL(config.oidcJwksUri));

export async function verifyAccessToken(raw: string) {
  const { payload } = await jwtVerify(raw, jwks, {
    issuer: config.oidcIssuer,
    audience: config.oidcAudience,
    algorithms: ['RS256'], // allowlist; closes the "none" algorithm
    clockTolerance: 5,
  });
  return payload;
}