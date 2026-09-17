import { childId, isContainer, typeOf } from "./json";

const MARK_ADDED = Symbol("added");
const MARK_REMOVED = Symbol("removed");

export type DiffKind = "added" | "removed" | "changed";

export interface DiffEntry {
  id: string; // pointer
  kind: DiffKind;
  a?: unknown;
  b?: unknown;
}

export interface DiffResult {
  entries: DiffEntry[];
  counts: Record<DiffKind, number>;
  truncated: boolean;
}

/**
 * Structural diff. Objects compare by key, arrays by index (an insertion near the
 * start of an array shows every later element as changed).
 */
export function diffJson(a: unknown, b: unknown, limit = 50_000): DiffResult {
  const entries: DiffEntry[] = [];
  const counts: Record<DiffKind, number> = { added: 0, removed: 0, changed: 0 };
  let truncated = false;
  const push = (e: DiffEntry) => {
    counts[e.kind]++;
    if (entries.length < limit) entries.push(e);
    else truncated = true;
  };

  // explicit stack, processed in document order
  const stack: [unknown, unknown, string][] = [[a, b, ""]];
  while (stack.length) {
    const [x, y, id] = stack.pop()!;
    if (x === MARK_ADDED) {
      push({ id, kind: "added", b: y });
      continue;
    }
    if (y === MARK_REMOVED) {
      push({ id, kind: "removed", a: x });
      continue;
    }
    const tx = typeOf(x);
    const ty = typeOf(y);
    if (tx !== ty || !isContainer(x)) {
      if (tx !== ty || x !== y) push({ id, kind: "changed", a: x, b: y });
      continue;
    }
    const next: [unknown, unknown, string][] = [];
    if (Array.isArray(x)) {
      const ya = y as unknown[];
      const n = Math.max(x.length, ya.length);
      for (let i = 0; i < n; i++) {
        const cid = childId(id, i);
        if (i >= ya.length) next.push([x[i], undefined, cid]);
        else if (i >= x.length) next.push([undefined, ya[i], cid]);
        else next.push([x[i], ya[i], cid]);
      }
    } else {
      const xo = x as Record<string, unknown>;
      const yo = y as Record<string, unknown>;
      const has = Object.prototype.hasOwnProperty;
      for (const k of Object.keys(xo)) next.push([xo[k], has.call(yo, k) ? yo[k] : undefined, childId(id, k)]);
      for (const k of Object.keys(yo)) if (!has.call(xo, k)) next.push([undefined, yo[k], childId(id, k)]);
    }
    for (let i = next.length - 1; i >= 0; i--) {
      const [cx, cy, cid] = next[i];
      if (cx === undefined) {
        stack.push([MARK_ADDED, cy, cid]);
      } else if (cy === undefined) {
        stack.push([cx, MARK_REMOVED, cid]);
      } else {
        stack.push([cx, cy, cid]);
      }
    }
  }
  return { entries, counts, truncated };
}

