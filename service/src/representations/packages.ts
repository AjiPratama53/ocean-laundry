import { PackageRow } from "../store/packages";

export interface PackageResponse {
  id: string;
  name: string;
  price: number;
}

export function toPackageResponse(row: PackageRow): PackageResponse {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
  };
}
