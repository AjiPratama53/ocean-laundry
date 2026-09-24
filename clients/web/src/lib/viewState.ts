import type { Problem } from "./api";

/**
 * Every data view declares this state explicitly BEFORE any network code
 * is written (A.5). `stale` + `fetchedAt` keep background-refresh failures
 * visible instead of presenting old data as current.
 */
export type ViewState<T> =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; problem: Problem; willRetry: boolean; retry: () => void }
  | {
      kind: "content";
      items: T;
      fetchedAt: Date;
      stale: boolean;
      staleNote: string | null;
    };

export function loading<T>(): ViewState<T> {
  return { kind: "loading" };
}

export function empty<T>(): ViewState<T> {
  return { kind: "empty" };
}
