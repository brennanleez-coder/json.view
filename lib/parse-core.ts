import { computeStats, type Stats } from "./json";
import { locateJsonError, type JsonError } from "./locate";

export type ParseOutcome =
  | { ok: true; value: unknown; stats: Stats; ms: number }
  | { ok: false; error: JsonError; ms: number };

export function parseDocument(text: string): ParseOutcome {
  const t0 = performance.now();
  try {
    const value = JSON.parse(text);
    return { ok: true, value, stats: computeStats(value), ms: performance.now() - t0 };
  } catch (e) {
    const located = locateJsonError(text) ?? {
      message: e instanceof Error ? e.message : "Invalid JSON",
      offset: 0,
      line: 1,
      column: 1,
    };
    return { ok: false, error: located, ms: performance.now() - t0 };
  }
}
