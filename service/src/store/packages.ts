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

export async function createPackage(data: {
  id: string;
  name: string;
  price: number;
}): Promise<PackageRow> {
  const { rows } = await pool.query<PackageRow>(
    `
      INSERT INTO packages (id, name, price)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [data.id, data.name, data.price],
  );

  return rows[0];
}

export async function updatePackage(
  id: string,
  data: {
    name?: string;
    price?: number;
  },
): Promise<PackageRow | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    values.push(data.name);
    setClauses.push(`name = $${values.length}`);
  }
  if (data.price !== undefined) {
    values.push(data.price);
    setClauses.push(`price = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return findPackageById(id); // No changes, return existing package
  }

  values.push(id);
  const { rows } = await pool.query<PackageRow>(
    `
      UPDATE packages
      SET ${setClauses.join(", ")}
      WHERE id = $${values.length}
      RETURNING *
    `,
    values,
  );

  return rows[0] ?? null;
}
