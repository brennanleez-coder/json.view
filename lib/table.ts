import { childId, isContainer, typeOf, type JsonType } from "./json";

export interface Column {
  key: string; // property name, or a synthetic key below
  label: string;
  presence: number; // 0..1 share of rows that have this column
  types: JsonType[]; // distinct types seen, most common first
  width: number; // px
}

export interface TableRow {
  id: string; // pointer of the row value
  label: string; // index or key
  cells: Map<string, { value: unknown; id: string } | undefined>;
}

export type TableKind = "records" | "entries" | "list";

export interface TableModel {
  kind: TableKind;
  columns: Column[];
  rows: TableRow[];
}

export const VALUE_COL = "\u0000value";
export const LABEL_COL = "\u0000label";
const CHAR_PX = 7.4;
const MAX_COLUMNS = 300;

const isRecord = (v: unknown) => isContainer(v) && !Array.isArray(v);

/** Build a table for any container. Arrays that are mostly objects become records. */
export function buildTable(value: unknown, scopeId: string): TableModel | null {
  if (!isContainer(value)) return null;

  if (Array.isArray(value)) {
    const recordCount = value.reduce<number>((n, v) => n + (isRecord(v) ? 1 : 0), 0);
    if (value.length > 0 && recordCount / value.length >= 0.5) return buildRecords(value, scopeId);
    return {
      kind: "list",
      columns: [col(VALUE_COL, "value", value.map((v) => ({ v })), (r) => r.v)],
      rows: value.map((v, i) => {
        const id = childId(scopeId, i);
        return { id, label: String(i), cells: new Map([[VALUE_COL, { value: v, id }]]) };
      }),
    };
  }

  const keys = Object.keys(value);
  const obj = value as Record<string, unknown>;
  return {
    kind: "entries",
    columns: [col(VALUE_COL, "value", keys.map((k) => ({ v: obj[k] })), (r) => r.v)],
    rows: keys.map((k) => {
      const id = childId(scopeId, k);
      return { id, label: k, cells: new Map([[VALUE_COL, { value: obj[k], id }]]) };
    }),
  };
}

function buildRecords(arr: unknown[], scopeId: string): TableModel {
  const order: string[] = [];
  const seen = new Set<string>();
  let hasNonRecord = false;
  for (const item of arr) {
    if (!isRecord(item)) {
      hasNonRecord = true;
      continue;
    }
    for (const k of Object.keys(item as object)) {
      if (!seen.has(k) && order.length < MAX_COLUMNS) {
        seen.add(k);
        order.push(k);
      }
    }
  }
  const rows: TableRow[] = arr.map((item, i) => {
    const id = childId(scopeId, i);
    const cells = new Map<string, { value: unknown; id: string } | undefined>();
    if (isRecord(item)) {
      const rec = item as Record<string, unknown>;
      for (const k of order) {
        if (Object.prototype.hasOwnProperty.call(rec, k)) cells.set(k, { value: rec[k], id: childId(id, k) });
      }
    } else {
      cells.set(VALUE_COL, { value: item, id });
    }
    return { id, label: String(i), cells };
  });
  const columns = order.map((k) => colFromRows(k, k, rows));
  if (hasNonRecord) columns.push(colFromRows(VALUE_COL, "(non-object)", rows));
  return { kind: "records", columns, rows };
}

function colFromRows(key: string, label: string, rows: TableRow[]): Column {
  return col(key, label, rows, (r) => r.cells.get(key)?.value, (r) => r.cells.has(key));
}

function col<T>(key: string, label: string, items: T[], get: (t: T) => unknown, has: (t: T) => boolean = () => true): Column {
  const typeCounts = new Map<JsonType, number>();
  let present = 0;
  let maxLen = label.length + 4;
  const sampleEvery = Math.max(1, Math.floor(items.length / 400));
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!has(it)) continue;
    present++;
    const v = get(it);
    const t = typeOf(v);
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    if (i % sampleEvery === 0) {
      const len = isContainer(v) ? 26 : typeof v === "string" ? v.length + 2 : String(v).length;
      if (len > maxLen) maxLen = len;
    }
  }
  const types = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  return {
    key,
    label,
    presence: items.length ? present / items.length : 1,
    types,
    width: Math.round(Math.min(360, Math.max(88, maxLen * CHAR_PX + 24))),
  };
}

const TYPE_RANK: Record<JsonType, number> = { number: 0, string: 1, boolean: 2, null: 3, array: 4, object: 5 };

export function compareCells(a: unknown, b: unknown, missingA: boolean, missingB: boolean): number {
  if (missingA || missingB) return missingA === missingB ? 0 : missingA ? 1 : -1; // missing always last
  const ta = typeOf(a);
  const tb = typeOf(b);
  if (ta !== tb) return TYPE_RANK[ta] - TYPE_RANK[tb];
  switch (ta) {
    case "number":
      return (a as number) - (b as number);
    case "string":
      return (a as string).localeCompare(b as string, undefined, { numeric: true });
    case "boolean":
      return Number(a) - Number(b);
    case "array":
      return (a as unknown[]).length - (b as unknown[]).length;
    case "object":
      return Object.keys(a as object).length - Object.keys(b as object).length;
    default:
      return 0;
  }
}

export function sortRows(rows: TableRow[], column: string | null, dir: 1 | -1): TableRow[] {
  if (column === null) return rows;
  const out = rows.slice();
  if (column === LABEL_COL) {
    const numeric = out.every((r) => /^\d+$/.test(r.label));
    out.sort((a, b) => dir * (numeric ? Number(a.label) - Number(b.label) : a.label.localeCompare(b.label, undefined, { numeric: true })));
    return out;
  }
  out.sort((a, b) => {
    const ca = a.cells.get(column);
    const cb = b.cells.get(column);
    const c = compareCells(ca?.value, cb?.value, !ca, !cb);
    // keep missing values last regardless of direction
    if (!ca || !cb) return c;
    return dir * c;
  });
  return out;
}

export function filterRows(rows: TableRow[], query: string): TableRow[] {
  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter((r) => {
    if (r.label.toLowerCase().includes(q)) return true;
    for (const c of r.cells.values()) {
      if (c && !isContainer(c.value) && String(c.value).toLowerCase().includes(q)) return true;
    }
    return false;
  });
}

export interface TableCandidate {
  id: string;
  rows: number;
  columns: number;
}

/** Arrays of records anywhere in the document, shallowest first. */
export function findRecordArrays(root: unknown, limit = 40, visitBudget = 200_000): TableCandidate[] {
  const out: TableCandidate[] = [];
  const queue: [unknown, string][] = [[root, ""]];
  let visited = 0;
  for (let q = 0; q < queue.length && out.length < limit && visited < visitBudget; q++) {
    const [v, id] = queue[q];
    visited++;
    if (Array.isArray(v)) {
      const sample = v.slice(0, 200);
      const recs = sample.filter(isRecord);
      if (v.length > 1 && recs.length / sample.length >= 0.5) {
        const keys = new Set<string>();
        for (const r of recs) for (const k of Object.keys(r as object)) keys.add(k);
        out.push({ id, rows: v.length, columns: keys.size });
        continue; // don't descend into rows of a table
      }
      v.forEach((c, i) => isContainer(c) && queue.push([c, childId(id, i)]));
    } else if (isContainer(v)) {
      for (const k of Object.keys(v)) {
        const c = (v as Record<string, unknown>)[k];
        if (isContainer(c)) queue.push([c, childId(id, k)]);
      }
    }
  }
  return out;
}
