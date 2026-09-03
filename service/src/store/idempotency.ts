import { pool } from "../app.ts";

export interface IdempotencyRecord {
  key: string;
  bodyHash: string;
  responseStatus: number;
  responseBody: unknown;
}

export async function findKey(key: string): Promise<IdempotencyRecord | null> {
  const { rows } = await pool.query(
    `SELECT key, body_hash, response_status, response_body
     FROM idempotency_keys
     WHERE key = $1`,
    [key]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    key: row.key,
    bodyHash: row.body_hash,
    responseStatus: row.response_status,
    responseBody: row.response_body,
  };
}

export async function saveKey(record: IdempotencyRecord): Promise<void> {
  await pool.query(
    `INSERT INTO idempotency_keys (key, body_hash, response_status, response_body)
     VALUES ($1, $2, $3, $4)`,
    [record.key, record.bodyHash, record.responseStatus, JSON.stringify(record.responseBody)]
  );
}