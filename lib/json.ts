// Core JSON document helpers: pointers, paths, tree flattening, stats, search.
// Everything here is iterative so very deep documents cannot blow the stack.

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type JsonType = "object" | "array" | "string" | "number" | "boolean" | "null";

export function typeOf(v: unknown): JsonType {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  const t = typeof v;
  if (t === "object") return "object";
  if (t === "string" || t === "number" || t === "boolean") return t;
  return "null";
}

export const isContainer = (v: unknown): v is Json[] | { [k: string]: Json } =>
  v !== null && typeof v === "object";

export function childCount(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (isContainer(v)) return Object.keys(v).length;
  return 0;
}

// ---------- JSON Pointer ids (RFC 6901). Root is "".

// fast path matters: this runs once per visible node when flattening large trees
const esc = (k: string) => (k.includes("~") || k.includes("/") ? k.replace(/~/g, "~0").replace(/\//g, "~1") : k);
const unesc = (k: string) => k.replace(/~1/g, "/").replace(/~0/g, "~");

export const childId = (parent: string, key: string | number) => (typeof key === "number" ? `${parent}/${key}` : `${parent}/${esc(key)}`);

export function pointerSegments(id: string): string[] {
  if (id === "") return [];
  return id.slice(1).split("/").map(unesc);
}

export function parentId(id: string): string | null {
  if (id === "") return null;
  return id.slice(0, id.lastIndexOf("/"));
}

export function ancestorIds(id: string): string[] {
  const out: string[] = [];
  let p = parentId(id);
  while (p !== null) {
    out.push(p);
    p = parentId(p);
  }
  return out.reverse();
}

export function getAt(root: unknown, id: string): { found: boolean; value: unknown } {
  let cur: unknown = root;
  for (const seg of pointerSegments(id)) {
    if (Array.isArray(cur)) {
      const idx = Number(seg);
      if (!/^\d+$/.test(seg) || idx >= cur.length) return { found: false, value: undefined };
      cur = cur[idx];
    } else if (isContainer(cur) && Object.prototype.hasOwnProperty.call(cur, seg)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return { found: false, value: undefined };
    }
  }
  return { found: true, value: cur };
}

export interface Crumb {
  id: string;
  label: string;
  isIndex: boolean;
}

export function crumbs(root: unknown, id: string): Crumb[] {
  const out: Crumb[] = [{ id: "", label: "$", isIndex: false }];
  let cur: unknown = root;
  let acc = "";
  for (const seg of pointerSegments(id)) {
    const isIndex = Array.isArray(cur);
    acc = childId(acc, seg);
    out.push({ id: acc, label: isIndex ? `[${seg}]` : seg, isIndex });
    cur = isIndex ? (cur as unknown[])[Number(seg)] : isContainer(cur) ? (cur as Record<string, unknown>)[seg] : undefined;
  }
  return out;
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** JSONPath like $.users[0]["first name"] */
export function toJsonPath(root: unknown, id: string): string {
  let s = "$";
  for (const c of crumbs(root, id).slice(1)) {
    if (c.isIndex) s += c.label;
    else if (IDENT.test(c.label)) s += `.${c.label}`;
    else s += `[${JSON.stringify(c.label)}]`;
  }
  return s;
}

/** JavaScript accessor like data.users[0]["first name"] */
export function toJsAccessor(root: unknown, id: string, base = "data"): string {
  return base + toJsonPath(root, id).slice(1);
}

// ---------- Tree flattening

export interface Row {
  id: string;
  depth: number;
  key: string | number | null; // null for root
  value: unknown;
  container: boolean;
  expanded: boolean;
  count: number;
}

export interface Expansion {
  depth: number; // containers with depth < this are expanded by default
  overrides: Map<string, boolean>;
}

export const isExpanded = (e: Expansion, id: string, depth: number) => {
  const o = e.overrides.get(id);
  return o === undefined ? depth < e.depth : o;
};

export function flatten(root: unknown, exp: Expansion, limit = 2_000_000): Row[] {
  const rows: Row[] = [];
  type Item = { key: string | number | null; value: unknown; id: string; depth: number };
  const stack: Item[] = [{ key: null, value: root, id: "", depth: 0 }];
  while (stack.length && rows.length < limit) {
    const it = stack.pop()!;
    const container = isContainer(it.value);
    const expanded = container && isExpanded(exp, it.id, it.depth);
    const count = container ? childCount(it.value) : 0;
    rows.push({ id: it.id, depth: it.depth, key: it.key, value: it.value, container, expanded, count });
    if (expanded && count) {
      if (Array.isArray(it.value)) {
        for (let i = it.value.length - 1; i >= 0; i--) {
          stack.push({ key: i, value: it.value[i], id: childId(it.id, i), depth: it.depth + 1 });
        }
      } else {
        const obj = it.value as Record<string, unknown>;
        const keys = Object.keys(obj);
        for (let i = keys.length - 1; i >= 0; i--) {
          stack.push({ key: keys[i], value: obj[keys[i]], id: childId(it.id, keys[i]), depth: it.depth + 1 });
        }
      }
    }
  }
  return rows;
}

// ---------- Stats

export interface Stats {
  nodes: number;
  objects: number;
  arrays: number;
  maxDepth: number;
}

export function computeStats(root: unknown): Stats {
  const s: Stats = { nodes: 0, objects: 0, arrays: 0, maxDepth: 0 };
  const stack: [unknown, number][] = [[root, 0]];
  while (stack.length) {
    const [v, d] = stack.pop()!;
    s.nodes++;
    if (d > s.maxDepth) s.maxDepth = d;
    if (Array.isArray(v)) {
      s.arrays++;
      for (let i = 0; i < v.length; i++) stack.push([v[i], d + 1]);
    } else if (isContainer(v)) {
      s.objects++;
      for (const k in v) stack.push([(v as Record<string, unknown>)[k], d + 1]);
    }
  }
  return s;
}

// ---------- Search

export interface SearchResult {
  ids: string[]; // document order
  truncated: boolean;
}

export function search(root: unknown, query: string, opts: { caseSensitive?: boolean; limit?: number } = {}): SearchResult {
  const limit = opts.limit ?? 20_000;
  const ids: string[] = [];
  if (!query) return { ids, truncated: false };
  const q = opts.caseSensitive ? query : query.toLowerCase();
  const norm = (s: string) => (opts.caseSensitive ? s : s.toLowerCase());
  type Item = { key: string | number | null; value: unknown; id: string };
  const stack: Item[] = [{ key: null, value: root, id: "" }];
  while (stack.length) {
    const it = stack.pop()!;
    const keyHit = typeof it.key === "string" && norm(it.key).includes(q);
    const valHit = !isContainer(it.value) && norm(it.value === null ? "null" : String(it.value)).includes(q);
    if (keyHit || valHit) {
      ids.push(it.id);
      if (ids.length >= limit) return { ids, truncated: true };
    }
    if (Array.isArray(it.value)) {
      for (let i = it.value.length - 1; i >= 0; i--) stack.push({ key: i, value: it.value[i], id: childId(it.id, i) });
    } else if (isContainer(it.value)) {
      const keys = Object.keys(it.value);
      for (let i = keys.length - 1; i >= 0; i--)
        stack.push({ key: keys[i], value: (it.value as Record<string, unknown>)[keys[i]], id: childId(it.id, keys[i]) });
    }
  }
  return { ids, truncated: false };
}

// ---------- Previews & formatting

export function scalarText(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (v === null) return "null";
  return String(v);
}

/** Short one-line preview of any value, e.g. {id: 1, name: "Ada", …} */
export function preview(v: unknown, max = 80): string {
  if (!isContainer(v)) {
    const s = scalarText(v);
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  }
  const arr = Array.isArray(v);
  const open = arr ? "[" : "{";
  const close = arr ? "]" : "}";
  let out = open;
  const entries: [string | null, unknown][] = arr
    ? (v as unknown[]).slice(0, 20).map((x) => [null, x])
    : Object.keys(v).slice(0, 20).map((k) => [k, (v as Record<string, unknown>)[k]]);
  const total = childCount(v);
  for (let i = 0; i < entries.length; i++) {
    const [k, x] = entries[i];
    const inner = isContainer(x) ? (Array.isArray(x) ? `[${x.length}]` : `{${childCount(x)}}`) : scalarText(x);
    const part = (i ? ", " : "") + (k === null ? "" : `${IDENT.test(k) ? k : JSON.stringify(k)}: `) + inner;
    if (out.length + part.length > max - 3) return out + (i ? ", …" : "…") + close;
    out += part;
  }
  if (total > entries.length) out += ", …";
  return out + close;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** Recursively parse string values that themselves contain JSON objects/arrays. */
export function expandNestedJson(v: unknown): { value: unknown; expanded: number } {
  let expanded = 0;
  const walk = (x: unknown, depth: number): unknown => {
    if (typeof x === "string") {
      const t = x.trim();
      if (depth < 64 && ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]")))) {
        try {
          const parsed = JSON.parse(t);
          expanded++;
          return walk(parsed, depth + 1);
        } catch {
          return x;
        }
      }
      return x;
    }
    if (Array.isArray(x)) return x.map((y) => walk(y, depth + 1));
    if (isContainer(x)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(x))
        // defineProperty so a "__proto__" key stays a plain own property
        Object.defineProperty(out, k, { value: walk((x as Record<string, unknown>)[k], depth + 1), enumerable: true, writable: true, configurable: true });
      return out;
    }
    return x;
  };
  return { value: walk(v, 0), expanded };
}

/** Nearest container at or above id. */
export function containerScope(root: unknown, id: string): string {
  let cur: string | null = id;
  while (cur !== null) {
    const r = getAt(root, cur);
    if (r.found && isContainer(r.value)) return cur;
    cur = parentId(cur);
  }
  return "";
}
