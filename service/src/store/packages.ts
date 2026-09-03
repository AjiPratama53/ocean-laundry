import { pool } from "../app.ts";

export interface PackageRow {
  id: string;
  name: string;
  price: number;
}

export async function findPackageById(id: string): Promise<PackageRow | null> {
  const { rows } = await pool.query<PackageRow>(
    `SELECT * FROM packages WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findPackages(params: {
  limit: number;
  cursor?: string;
}): Promise<PackageRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.cursor) {
    values.push(params.cursor);
    conditions.push(`id > $${values.length}`); // simple cursor: id-based
  }

  values.push(params.limit);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query<PackageRow>(
    `SELECT * FROM packages ${where} ORDER BY id ASC LIMIT $${values.length}`,
    values,
  );
  return rows;
}
