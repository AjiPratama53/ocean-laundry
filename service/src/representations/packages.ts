import { PackageRow } from "../store/packages.js";

export interface PackageResponse {
  id: string;
  name: string;
  description: string;
  price: number;
}

export function toPackageResponse(row: PackageRow): PackageResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
  };
}
