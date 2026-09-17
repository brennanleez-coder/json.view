import { describe, expect, it } from "vitest";
import { locateJsonError } from "../lib/locate";
import { flatten, search, toJsonPath, crumbs, getAt, computeStats, preview, expandNestedJson, containerScope } from "../lib/json";
import { buildTable, sortRows, filterRows, VALUE_COL } from "../lib/table";
import { diffJson } from "../lib/diff";
import { inferSchema } from "../lib/schema";
import { buildGraph } from "../lib/graph";
import { tokenizeLine } from "../lib/highlight";

describe("locateJsonError", () => {
  const cases: [string, number, number, RegExp][] = [
    ['{"a": 1,}', 1, 8, /Trailing comma/],
    ['{\n  "a": 1\n  "b": 2\n}', 3, 3, /Expected ','/],
    ["{'a': 1}", 1, 2, /double quotes/],
    ["{a: 1}", 1, 2, /double-quoted/],
    ["[1, 2", 1, 6, /end of input/],
    ['{"a": tru}', 1, 7, /Unexpected token/],
    ['{"a": 01}', 1, 8, /leading zeros/],
    ['{"a": "x\ny"}', 1, 9, /Unterminated string/],
    ["[1] 2", 1, 5, /after the end/],
    ['{"a": 1] ', 1, 8, /Mismatched/],
    ["// hi\n{}", 1, 1, /Comments/],
    ["", 1, 1, /empty/],
  ];
  for (const [text, line, col, re] of cases) {
    it(`reports ${JSON.stringify(text)}`, () => {
      expect(() => JSON.parse(text)).toThrow();
      const e = locateJsonError(text)!;
      expect(e).not.toBeNull();
      expect(e.message).toMatch(re);
      expect([e.line, e.column]).toEqual([line, col]);
    });
  }

  it("agrees with JSON.parse on thousands of mutated documents", () => {
    const base = JSON.stringify(
      { a: [1, -2.5e3, true, false, null, 'q"\\' + String.fromCharCode(233) + "\n"], b: { c: {}, d: [] }, "e f": String.fromCharCode(1) },
      null,
      2,
    );
    let rng = 42;
    const rand = (n: number) => (rng = (rng * 1103515245 + 12345) % 2 ** 31) % n;
    const alphabet = "{}[]\",:.-+e0123456789 \ntfnul\\/'xE";
    expect(locateJsonError(base)).toBeNull();
    for (let k = 0; k < 6000; k++) {
      let s = base;
      const ops = 1 + rand(3);
      for (let j = 0; j < ops; j++) {
        const p = rand(s.length + 1);
        const op = rand(3);
        const ch = alphabet[rand(alphabet.length)];
        s = op === 0 ? s.slice(0, p) + s.slice(p + 1) : op === 1 ? s.slice(0, p) + ch + s.slice(p) : s.slice(0, p) + ch + s.slice(p + 1);
      }
      let valid = true;
      try {
        JSON.parse(s);
      } catch {
        valid = false;
      }
      expect(locateJsonError(s) === null, s).toBe(valid);
    }
  });

  it("handles very deep nesting without recursion", () => {
    const deep = "[".repeat(100000) + "]".repeat(99999);
    expect(locateJsonError(deep)!.message).toMatch(/end of input/);
  });
});

describe("tree helpers", () => {
  const doc = { users: [{ id: 1, "first name": "Ada", tags: ["x"] }, { id: 2 }], "a/b": { "~": 1 } };

  it("flattens with depth and overrides", () => {
    const rows = flatten(doc, { depth: 1, overrides: new Map() });
    expect(rows.map((r) => r.id)).toEqual(["", "/users", "/a~1b"]);
    const rows2 = flatten(doc, { depth: 1, overrides: new Map([["/users", true]]) });
    expect(rows2.map((r) => r.id)).toEqual(["", "/users", "/users/0", "/users/1", "/a~1b"]);
    expect(flatten(doc, { depth: Infinity, overrides: new Map() }).length).toBe(computeStats(doc).nodes);
  });

  it("formats paths and crumbs", () => {
    expect(toJsonPath(doc, "/users/0/first name")).toBe('$.users[0]["first name"]');
    expect(toJsonPath(doc, "/a~1b/~0")).toBe('$["a/b"]["~"]');
    expect(crumbs(doc, "/users/1").map((c) => c.label)).toEqual(["$", "users", "[1]"]);
    expect(getAt(doc, "/a~1b/~0")).toEqual({ found: true, value: 1 });
    expect(getAt(doc, "/users/9").found).toBe(false);
    expect(containerScope(doc, "/users/0/id")).toBe("/users/0");
  });

  it("searches keys and values in document order", () => {
    expect(search(doc, "ada").ids).toEqual(["/users/0/first name"]);
    expect(search(doc, "id").ids).toEqual(["/users/0/id", "/users/1/id"]);
    expect(search(doc, "1").ids).toEqual(["/users/0/id", "/a~1b/~0"]);
  });

  it("stats and previews", () => {
    expect(computeStats(doc)).toMatchObject({ maxDepth: 4, arrays: 2, objects: 4 });
    expect(preview(doc.users[0], 80)).toBe('{id: 1, "first name": "Ada", tags: [1]}');
    expect(preview(Array.from({ length: 100 }, (_, i) => i), 20).endsWith("…]")).toBe(true);
  });

  it("expands nested JSON strings without prototype pollution", () => {
    const r = expandNestedJson({ body: '{"__proto__": {"x": 1}, "list": "[1,2]"}' });
    const body = (r.value as Record<string, any>).body;
    expect(r.expanded).toBe(2);
    expect(Object.getPrototypeOf(body)).toBe(Object.prototype);
    expect(Object.keys(body)).toEqual(["__proto__", "list"]);
    expect(body.list).toEqual([1, 2]);
  });
});

describe("table", () => {
  const arr = [{ id: 2, name: "b", meta: { x: 1 } }, { id: 10, name: "a" }, { name: "c", extra: true }, 5];
  it("builds records with a union of columns", () => {
    const t = buildTable(arr, "")!;
    expect(t.kind).toBe("records");
    expect(t.columns.map((c) => c.label)).toEqual(["id", "name", "meta", "extra", "(non-object)"]);
    expect(t.columns[0].presence).toBe(0.5);
    expect(t.rows[0].cells.get("meta")!.id).toBe("/0/meta");
  });
  it("sorts numerically with missing last in both directions", () => {
    const t = buildTable(arr, "")!;
    expect(sortRows(t.rows, "id", 1).map((r) => r.label)).toEqual(["0", "1", "2", "3"]);
    expect(sortRows(t.rows, "id", -1).map((r) => r.label)).toEqual(["1", "0", "2", "3"]);
    expect(filterRows(t.rows, "c").map((r) => r.label)).toEqual(["2"]);
  });
  it("objects become entries", () => {
    expect(buildTable({ a: 1 }, "/x")!.rows[0].cells.get(VALUE_COL)!.id).toBe("/x/a");
  });
});

describe("diff", () => {
  it("finds added, removed, changed in order", () => {
    const r = diffJson({ a: 1, b: [1, 2], c: { d: 1 }, e: "x" }, { a: 2, b: [1], c: { d: 1, f: null }, g: 1, e: "x" });
    expect(r.entries.map((e) => `${e.kind}:${e.id}`)).toEqual(["changed:/a", "removed:/b/1", "added:/c/f", "added:/g"]);
    expect(r.counts).toEqual({ added: 2, removed: 1, changed: 1 });
    expect(diffJson({ a: [1] }, { a: [1] }).entries).toEqual([]);
    expect(diffJson({ a: [1] }, { a: { 0: 1 } }).entries[0].kind).toBe("changed");
  });
});

describe("schema", () => {
  it("merges array items and computes required", () => {
    const s = inferSchema([{ id: 1, name: "a" }, { id: 2.5 }]) as any;
    expect(s.type).toBe("array");
    expect(s.items.required).toEqual(["id"]);
    expect(s.items.properties.id.type).toBe("number");
    expect(s.items.properties.name.type).toBe("string");
    expect((inferSchema({ n: 3 }) as any).properties.n.type).toBe("integer");
  });
});

describe("graph", () => {
  it("lays out cards without overlap and respects budget", () => {
    const doc = { a: { b: { c: 1 }, d: [1, 2, { e: 1 }] }, f: Array.from({ length: 50 }, (_, i) => ({ i })) };
    const g = buildGraph(doc, "", "$", { maxCards: 10, maxRows: 5 });
    expect(g.cards.length).toBe(10);
    expect(g.truncated).toBe(true);
    for (const x of g.cards)
      for (const y of g.cards) {
        if (x === y || x.depth !== y.depth) continue;
        expect(x.y + x.h <= y.y || y.y + y.h <= x.y).toBe(true);
      }
    const f = g.cards.find((c) => c.id === "/f")!;
    expect(f.rows.at(-1)!.text).toBe("+45 more");
    for (const e of g.edges) expect(g.cards[e.from].rows[e.row].childCard).toBe(e.to);
  });
});

describe("highlight", () => {
  it("tokenises keys vs strings", () => {
    const line = '  "a\\"b": ["x", 1.5e3, true, null],';
    const t = tokenizeLine(line);
    expect(t.filter((x) => x.kind !== "text" && x.kind !== "punct").map((x) => x.kind)).toEqual(["key", "string", "number", "boolean", "null"]);
    expect(t.map((x) => x.text).join("")).toBe(line);
  });
});
