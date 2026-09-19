import { JWTPayload } from 'jose';

export interface Principal {
  subject: string;
  kind: 'service' | 'user';
  scopes: string[];
  tokenId?: string;
}

export function principalFrom(claims: JWTPayload): Principal {
  return {
    subject: claims.sub ?? '',
    kind: claims.sub === claims.azp ? 'service' : 'user', // verify against a real token
    scopes: String(claims.scope ?? '').split(' ').filter(Boolean),
    tokenId: claims.jti,
  };
}