const required = ['DATABASE_URL', 'OIDC_ISSUER', 'OIDC_JWKS_URI', 'OIDC_AUDIENCE'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(`required configuration missing: ${missing.join(', ')}`);
}

export const config = {
  databaseUrl: process.env.DATABASE_URL!,
  oidcIssuer: process.env.OIDC_ISSUER!,
  oidcJwksUri: process.env.OIDC_JWKS_URI!,
  oidcAudience: process.env.OIDC_AUDIENCE!,
};