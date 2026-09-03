export function problem(status: number, detail: string, instance: string) {
  const titles: Record<number, string> = {
    400: "Request validation failed",
    404: "Resource not found",
    409: "Request conflicts with the current state",
    422: "Request cannot be processed",
    500: "Internal server error",
  };
  return {
    type: `https://oceanlaundry.api/problems/${titles[status]
      .toLowerCase()
      .replace(/\s+/g, "-")}`,
    title: titles[status] ?? "Error",
    status,
    detail,
    instance,
  };
}