export type ProblemType =
  | "validation-error"
  | "not-found"
  | "conflict"
  | "idempotency-key-reuse"
  | "internal-server-error";

const titles: Record<ProblemType, string> = {
  "validation-error": "Request validation failed",
  "not-found": "Resource not found",
  "conflict": "Order state conflict",
  "idempotency-key-reuse": "Idempotency-Key was reused with a different body",
  "internal-server-error": "Internal server error",
};

export function problem(
  status: number,
  type: ProblemType,
  detail: string,
  instance: string,
  extensions?: Record<string, unknown>,
) {
  return {
    ...extensions,
    type: `https://oceanlaundry.api/problems/${type}`,
    title: titles[type],
    status,
    detail,
    instance,
  };
}